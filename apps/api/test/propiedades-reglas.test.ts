// Pruebas de las reglas puras de la ficha (pieza C): documentos, alertas, cifras de obra,
// historial y vencimientos. No usan la API ni la base: llaman directo a las funciones de
// dominio/ficha/. Las de la API (permisos, recortes, rutas) están en propiedades.test.ts.
import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { hoyChile, sumarDias } from "../src/util/fechas";
import { alertasDeFicha } from "../src/dominio/ficha/alertas";
import { agruparDocumentos, estadoDeDocumento, grupoDeDocumento } from "../src/dominio/ficha/documentos";
import { validarPropiedad } from "../src/dominio/ficha/entrada";
import { construirHistorial, type DatosDeHistorial } from "../src/dominio/ficha/historial";
import { cifrasDeObras, margenDeObra, sumarPorMoneda, totalPorRecinto } from "../src/dominio/ficha/reparaciones";
import { gravedadDe, pendientesDePapelesQueFaltan, servicioSugeridoDe } from "../src/dominio/ficha/vencimientos";
import { ErrorApi } from "../src/errores";

const hoy = hoyChile();

describe("reglas puras", () => {
  const doc = (papel: "PLANO" | "POLIZA_SEGURO" | null, dias: number | null, id = "d") => ({
    id,
    nombre: `doc ${id}`,
    tipo: papel === "POLIZA_SEGURO" ? ("SEGURO" as const) : ("OTRO" as const),
    papel,
    fechaEmision: null,
    createdAt: new Date("2026-01-01T00:00:00Z"),
    fechaVencimiento: dias === null ? null : sumarDias(hoy, dias),
  });

  test("estado de un documento según su vencimiento", () => {
    assert.equal(estadoDeDocumento(null, hoy), "vigente");
    assert.equal(estadoDeDocumento(sumarDias(hoy, 46), hoy), "vigente");
    assert.equal(estadoDeDocumento(sumarDias(hoy, 45), hoy), "vence");
    assert.equal(estadoDeDocumento(sumarDias(hoy, 0), hoy), "vence");
    assert.equal(estadoDeDocumento(sumarDias(hoy, -1), hoy), "vencido");
  });

  test("grupo de un documento: por papel, o por cajón si no tiene papel", () => {
    assert.equal(grupoDeDocumento("PLANO", "OTRO"), "planos");
    assert.equal(grupoDeDocumento("DOMINIO_VIGENTE", "OTRO"), "dominio");
    assert.equal(grupoDeDocumento(null, "MUNICIPAL"), "municipales");
    assert.equal(grupoDeDocumento(null, "AVALUO_TASACION"), "informes");
    assert.equal(grupoDeDocumento(null, "OTRO"), "otros");
  });

  test("una póliza renovada deja de contar la vencida; un papel sin documentos falta", () => {
    const r = agruparDocumentos({
      tipo: "BODEGA",
      estado: "DISPONIBLE",
      documentos: [doc("POLIZA_SEGURO", -30, "vieja"), doc("POLIZA_SEGURO", 300, "nueva"), doc("PLANO", -5, "plano")],
      hoy,
    });
    const todos = r.grupos.flatMap((g) => g.items);
    assert.ok(!todos.some((i) => i.documento?.id === "vieja"));
    assert.equal(todos.find((i) => i.documento?.id === "nueva")?.estado, "vigente");
    assert.equal(todos.find((i) => i.documento?.id === "plano")?.estado, "vencido");
    assert.equal(todos.filter((i) => i.estado === "falta").length, r.faltan);
    assert.ok(r.faltan >= 4, "faltan escritura, dominio, hipotecas, avalúo y CIP");
  });

  test("alertas de la ficha: falta, vencido, vence y contribuciones", () => {
    const alertas = alertasDeFicha({
      tipo: "BODEGA",
      estado: "DISPONIBLE",
      documentos: [doc("PLANO", -5, "p"), doc("POLIZA_SEGURO", 10, "s")],
      contribuciones: [
        { id: "c1", anio: 2026, cuota: 1, fechaVencimiento: sumarDias(hoy, -3) },
        { id: "c2", anio: 2026, cuota: 2, fechaVencimiento: sumarDias(hoy, 10) },
        { id: "c3", anio: 2026, cuota: 3, fechaVencimiento: sumarDias(hoy, 90) },
      ],
      hoy,
    });
    const tipos = alertas.map((a) => a.tipo);
    assert.ok(tipos.includes("DOCUMENTO_FALTA"));
    assert.ok(tipos.includes("DOCUMENTO_VENCIDO"));
    assert.ok(tipos.includes("DOCUMENTO_VENCE"));
    assert.ok(tipos.includes("CONTRIBUCION_VENCIDA"));
    assert.ok(tipos.includes("CONTRIBUCION_VENCE"));
    assert.equal(alertas.filter((a) => a.referenciaId === "c3").length, 0, "una cuota a 90 días no es alerta");
    assert.equal(alertas[0].gravedad, "alta", "lo más grave va primero");
  });

  test("margen: solo con orden en pesos; las cifras separan monedas", () => {
    assert.deepEqual(margenDeObra({ total: "1000", moneda: "CLP" }, 600, true), { valor: "400", moneda: "CLP" });
    assert.equal(margenDeObra({ total: "10", moneda: "UF" }, 600, true), null);
    assert.equal(margenDeObra(null, 600, true), null);
    const c = cifrasDeObras([
      { orden: { total: "1000", moneda: "CLP" }, costo: 600, conCostoAprobado: true },
      { orden: { total: "10", moneda: "UF" }, costo: 100, conCostoAprobado: true },
    ]);
    assert.deepEqual(c.cobrado, [
      { valor: "1000", moneda: "CLP" },
      { valor: "10", moneda: "UF" },
    ]);
    assert.deepEqual(c.costo, { valor: "700", moneda: "CLP" });
    assert.deepEqual(c.margen, { valor: "400", moneda: "CLP" });
    assert.equal(cifrasDeObras([{ orden: null, costo: 5, conCostoAprobado: true }]).margen, null);
  });

  test("margen: sin presupuesto de maestro aprobado no hay margen (el costo no es cero, es desconocido)", () => {
    assert.equal(margenDeObra({ total: "1000", moneda: "CLP" }, 0, false), null);
    // Una obra sin costo aprobado no entra al margen de la propiedad; la otra sí.
    const c = cifrasDeObras([
      { orden: { total: "1000", moneda: "CLP" }, costo: 600, conCostoAprobado: true },
      { orden: { total: "5000", moneda: "CLP" }, costo: 0, conCostoAprobado: false },
    ]);
    assert.deepEqual(c.margen, { valor: "400", moneda: "CLP" });
    assert.equal(cifrasDeObras([{ orden: { total: "5000", moneda: "CLP" }, costo: 0, conCostoAprobado: false }]).margen, null);
    assert.deepEqual(sumarPorMoneda([{ valor: "0.1", moneda: "CLP" }, { valor: "0.2", moneda: "CLP" }]), [{ valor: "0.3", moneda: "CLP" }]);
  });

  test("total por recinto ignora las líneas que Odoo ya no trae", () => {
    const t = totalPorRecinto([
      { recinto: "Baño", precioDueno: "100", moneda: "CLP", quitadaEnOdoo: false },
      { recinto: "Baño", precioDueno: "50", moneda: "CLP", quitadaEnOdoo: false },
      { recinto: "Baño", precioDueno: "999", moneda: "CLP", quitadaEnOdoo: true },
      { recinto: null, precioDueno: null, moneda: "CLP", quitadaEnOdoo: false },
    ]);
    assert.deepEqual(t, [
      { recinto: "Baño", total: [{ valor: "150", moneda: "CLP" }], partidas: 2 },
      { recinto: null, total: [], partidas: 1 },
    ]);
  });

  test("validarPropiedad junta todos los problemas", () => {
    assert.throws(
      () => validarPropiedad({ compra: { fecha: "2999-01-01", precio: null } }, hoy),
      (error: unknown) => error instanceof ErrorApi && error.estado === 400 && "compra.fecha" in (error.campos ?? {}),
    );
    assert.doesNotThrow(() => validarPropiedad({ direccion: "x" }, hoy));
  });

  test("gravedad, servicio sugerido y papeles que faltan", () => {
    assert.equal(gravedadDe("ATRASADO"), "alta");
    assert.equal(gravedadDe("SEMANA"), "media");
    assert.equal(gravedadDe("TRIMESTRE"), "baja");
    assert.deepEqual(servicioSugeridoDe("PAPEL"), { tipo: "EVALUACION" });
    assert.equal(servicioSugeridoDe("COBROS_SIN_GENERAR"), null);
    const faltan = pendientesDePapelesQueFaltan(
      [{ id: "p1", direccion: "x", comuna: "y", organizationId: "o", tipo: "TERRENO", estado: "DISPONIBLE", documents: [{ papel: "ESCRITURA" }] }],
      hoy,
    );
    assert.ok(faltan.length > 0);
    assert.ok(!faltan.some((i) => i.clave.endsWith(":ESCRITURA")));
  });

  test("el historial recorta para el dueño", () => {
    const base: DatosDeHistorial = {
      servicios: [
        { id: "s1", tipo: "VENTA", estado: "ABIERTO", abiertoEl: new Date("2026-01-01T00:00:00Z"), cerradoEl: null, motivoCierre: null, porRevisar: false, porConfirmar: false, servicio: { nombre: "Venta" } },
        { id: "s2", tipo: "OBRA", estado: "CANCELADO", abiertoEl: new Date("2026-01-02T00:00:00Z"), cerradoEl: null, motivoCierre: "x", porRevisar: false, porConfirmar: false, servicio: { nombre: "Obra" } },
      ],
      notas: [
        { id: "n1", servicioEnCursoId: "s1", texto: "publica", paraDueno: true, createdAt: new Date("2026-01-03T00:00:00Z"), autor: { nombre: "Ana" } },
        { id: "n2", servicioEnCursoId: "s1", texto: "interna", paraDueno: false, createdAt: new Date("2026-01-04T00:00:00Z"), autor: { nombre: "Ana" } },
        { id: "n3", servicioEnCursoId: "s2", texto: "de cancelado", paraDueno: true, createdAt: new Date("2026-01-05T00:00:00Z"), autor: { nombre: "Ana" } },
      ],
      eventos: [],
      visitas: [],
      ofertas: [],
      documentos: [],
      presupuestos: [],
      partidas: [],
    };
    const dueno = construirHistorial(base, true).map((i) => i.id);
    assert.deepEqual(dueno.sort(), ["nota:n1", "servicio-abierto:s1"]);
    const equipo = construirHistorial(base, false).map((i) => i.id);
    assert.ok(equipo.includes("nota:n2") && equipo.includes("servicio-abierto:s2"));
  });
});
