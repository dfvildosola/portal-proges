// Pruebas de lo que la web necesita de la API (pieza I2): los PDF en el Drive de la propiedad,
// la carpeta de Drive de cada propiedad y la lista del equipo. Drive y Odoo son falsos.
//
// Los PDF de los documentos ya se prueban a fondo en propiedades.test.ts (subir, entregar, borrar);
// aquí van los casos nuevos: sin carpeta, Drive caído, documentos de antes de Drive y el PDF de
// un presupuesto de maestro.
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { idDeCarpeta, esIdDeArchivo } from "../src/integraciones/drive";
import { clavesInternas, crearEscenario, type Escenario } from "./ayuda";

const unico = `${process.pid}${Date.now().toString(36)}`;
const CARPETA = `carpeta_${unico}_abcdef`;
const CARPETA_VALIDA = "1AbCdEfGhIjKlMnOpQrStUv";
const PDF = "%PDF-1.4 prueba de Drive";

const archivos = new Map<string, Uint8Array>();
const papelera: string[] = [];
let revisadas: string[] = [];
let driveCaido = false;
let subidas = 0;
// Qué responde comprobarCarpeta según la carpeta que se le pase.
let respuestaDeCarpeta: { ok: true } | { ok: false; motivo: string } = { ok: true };

let e: Escenario;
let conCarpeta: string;
let sinCarpeta: string;
let deB: string;
let servicioId: string;
let catalogoId: string;
let maestroId: string;
let presupuestoConPdf: string;
let presupuestoSinPdf: string;

before(async () => {
  e = await crearEscenario({
    drive: {
      subirArchivo: async ({ datos }) => {
        if (driveCaido) throw new Error("Drive no responde (prueba).");
        subidas += 1;
        const driveFileId = `archivo_${unico}_${subidas}_abcdef`;
        archivos.set(driveFileId, datos);
        return { driveFileId };
      },
      leerArchivo: async (id) => {
        if (driveCaido) throw new Error("Drive no responde (prueba).");
        const datos = archivos.get(id);
        if (!datos) throw new Error(`No hay archivo ${id}`);
        return { datos: Buffer.from(datos), mime: "application/octet-stream", nombre: "x" };
      },
      borrarArchivo: async (id) => {
        papelera.push(id);
      },
      comprobarCarpeta: async (id) => {
        revisadas.push(id);
        return respuestaDeCarpeta;
      },
    },
  });
  const nueva = (organizationId: string, direccion: string, driveCarpetaId?: string) =>
    db.property.create({
      data: { organizationId, tipo: "CASA", direccion: `${direccion} ${unico}`, comuna: "Santiago", region: "RM", driveCarpetaId },
    });
  conCarpeta = (await nueva(e.ids.clienteA, "Con carpeta", CARPETA)).id;
  sinCarpeta = (await nueva(e.ids.clienteA, "Sin carpeta")).id;
  deB = (await nueva(e.ids.clienteB, "De B", `carpeta_b_${unico}_abcdef`)).id;

  catalogoId = (
    await db.servicio.create({ data: { organizationId: ORG_PROGES, codigo: `ARCH-${unico}`, familia: "RR", nombre: `Prueba archivos ${unico}` } })
  ).id;
  maestroId = (
    await db.maestro.create({ data: { organizationId: ORG_PROGES, odooPartnerId: 800_000_000 + (Date.now() % 100_000_000), nombre: `Maestro Archivos ${unico}` } })
  ).id;
  servicioId = (
    await db.servicioEnCurso.create({
      data: { organizationId: e.ids.clienteA, propertyId: conCarpeta, servicioId: catalogoId, tipo: "OBRA", responsableId: e.ids.equipo },
    })
  ).id;
  archivos.set(`presupuesto_${unico}_abcdef`, new TextEncoder().encode(PDF));
  const presupuesto = (pdfDriveFileId: string | null) =>
    db.presupuestoMaestro.create({
      data: { organizationId: e.ids.clienteA, servicioEnCursoId: servicioId, maestroId, total: "1000000", cargadoPorId: e.ids.equipo, pdfDriveFileId },
    });
  presupuestoConPdf = (await presupuesto(`presupuesto_${unico}_abcdef`)).id;
  presupuestoSinPdf = (await presupuesto(null)).id;
});

after(async () => {
  await e.limpiar();
  await db.maestro.deleteMany({ where: { id: maestroId } });
  await db.servicio.deleteMany({ where: { id: catalogoId } });
});

const formularioPdf = (contenido = PDF, tipo = "application/pdf") => {
  const f = new FormData();
  f.append("file", new File([contenido], "papel.pdf", { type: tipo }));
  f.append("papel", "PLANO");
  return f;
};

describe("PDF de los documentos en Drive", () => {
  test("sin carpeta enlazada no se sube: 409 con qué hacer", async () => {
    const r = await e.pedir("equipo", "POST", `/v1/propiedades/${sinCarpeta}/documentos`, formularioPdf());
    assert.equal(r.estado, 409);
    assert.match(r.cuerpo.error.mensaje, /Primero enlaza la carpeta de Drive de la propiedad/);
    assert.equal(await db.document.count({ where: { propertyId: sinCarpeta } }), 0);
  });

  test("lo que no es PDF de verdad se rechaza aunque diga serlo", async () => {
    const r = await e.pedir("equipo", "POST", `/v1/propiedades/${conCarpeta}/documentos`, formularioPdf("esto es una foto renombrada"));
    assert.equal(r.estado, 400);
    assert.ok(r.cuerpo.error.campos.file);
  });

  test("si Drive falla al subir responde 502 y no queda nada en la base", async () => {
    driveCaido = true;
    try {
      const r = await e.pedir("equipo", "POST", `/v1/propiedades/${conCarpeta}/documentos`, formularioPdf());
      assert.equal(r.estado, 502);
      assert.match(r.cuerpo.error.mensaje, /Drive/);
      assert.equal(await db.document.count({ where: { propertyId: conCarpeta } }), 0);
    } finally {
      driveCaido = false;
    }
  });

  test("se guarda el id de Drive, se entrega como PDF con el permiso revisado y al borrar va a la papelera", async () => {
    const subido = await e.pedir("equipo", "POST", `/v1/propiedades/${conCarpeta}/documentos`, formularioPdf());
    assert.equal(subido.estado, 201, JSON.stringify(subido.cuerpo));
    const fila = await db.document.findUniqueOrThrow({ where: { id: subido.cuerpo.id } });
    assert.ok(esIdDeArchivo(fila.blobKey) && archivos.has(fila.blobKey), "se guarda el id del archivo en Drive");
    assert.ok(!JSON.stringify(subido.cuerpo).includes(fila.blobKey), "el id nunca sale en la respuesta");

    const ruta = `/v1/documentos/${subido.cuerpo.id}/archivo`;
    const mio = await e.pedir("clienteA", "GET", ruta);
    assert.equal(mio.estado, 200);
    assert.equal(mio.cuerpo, PDF);
    const crudo = await e.app.request(ruta, { headers: { Authorization: `Bearer ${e.tokens.clienteA}` } });
    assert.equal(crudo.headers.get("content-type"), "application/pdf", "siempre como PDF, aunque Drive diga otra cosa");
    assert.equal(crudo.headers.get("cache-control"), "private, no-store");
    assert.equal((await e.pedir("clienteB", "GET", ruta)).estado, 404);
    assert.equal((await e.pedir("anonimo", "GET", ruta)).estado, 401);

    driveCaido = true;
    try {
      assert.equal((await e.pedir("equipo", "GET", ruta)).estado, 502);
    } finally {
      driveCaido = false;
    }

    assert.equal((await e.pedir("clienteA", "DELETE", `/v1/documentos/${subido.cuerpo.id}`)).estado, 204);
    assert.ok(papelera.includes(fila.blobKey));
  });

  test("un documento de antes de Drive responde 404 con la explicación, sin llamar a Drive", async () => {
    const viejo = await db.document.create({
      data: {
        organizationId: e.ids.clienteA,
        propertyId: conCarpeta,
        tipo: "MANTENCION",
        nombre: "Antiguo",
        blobKey: "https://almacen-antiguo.example/proges/archivo.pdf",
        subidoPorId: e.ids.equipo,
      },
    });
    driveCaido = true; // si la ruta llamara a Drive, daría 502 y no 404
    try {
      const r = await e.pedir("equipo", "GET", `/v1/documentos/${viejo.id}/archivo`);
      assert.equal(r.estado, 404);
      assert.match(r.cuerpo.error.mensaje, /sistema anterior/);
    } finally {
      driveCaido = false;
    }
    const antes = papelera.length;
    assert.equal((await e.pedir("equipo", "DELETE", `/v1/documentos/${viejo.id}`)).estado, 204);
    assert.equal(papelera.length, antes, "no hay nada que mandar a la papelera de Drive");
  });
});

describe("PDF del presupuesto de un maestro", () => {
  test("se entrega solo al equipo, desde Drive", async () => {
    const ruta = `/v1/presupuestos/${presupuestoConPdf}/archivo`;
    const r = await e.pedir("equipo", "GET", ruta);
    assert.equal(r.estado, 200);
    assert.equal(r.cuerpo, PDF);
    for (const quien of ["clienteA", "llaveA"] as const) assert.equal((await e.pedir(quien, "GET", ruta)).estado, 403, quien);
    assert.equal((await e.pedir("clienteB", "GET", ruta)).estado, 403);
    assert.equal((await e.pedir("anonimo", "GET", ruta)).estado, 401);
  });

  test("sin PDF o inexistente da 404; con Drive caído, 502", async () => {
    assert.equal((await e.pedir("equipo", "GET", `/v1/presupuestos/${presupuestoSinPdf}/archivo`)).estado, 404);
    assert.equal((await e.pedir("equipo", "GET", "/v1/presupuestos/no-existe/archivo")).estado, 404);
    driveCaido = true;
    try {
      assert.equal((await e.pedir("equipo", "GET", `/v1/presupuestos/${presupuestoConPdf}/archivo`)).estado, 502);
    } finally {
      driveCaido = false;
    }
  });

  test("cargar un presupuesto con PDF a una propiedad sin carpeta dice lo mismo que los documentos", async () => {
    const otro = await db.servicioEnCurso.create({
      data: { organizationId: e.ids.clienteA, propertyId: sinCarpeta, servicioId: catalogoId, tipo: "OBRA", responsableId: e.ids.equipo },
    });
    const f = new FormData();
    f.append("maestroId", maestroId);
    f.append("tipo", "ORIGINAL");
    f.append("total", "1000");
    f.append("pdf", new File([PDF], "p.pdf", { type: "application/pdf" }));
    const r = await e.pedir("equipo", "POST", `/v1/servicios/${otro.id}/presupuestos`, f);
    assert.equal(r.estado, 409);
    assert.match(r.cuerpo.error.mensaje, /Primero enlaza la carpeta de Drive de la propiedad/);
  });
});

describe("la carpeta de Drive de la propiedad", () => {
  test("la ficha dice si hay carpeta, sin mostrar su id", async () => {
    const con = await e.pedir("equipo", "GET", `/v1/propiedades/${conCarpeta}`);
    const sin = await e.pedir("equipo", "GET", `/v1/propiedades/${sinCarpeta}`);
    assert.equal(con.cuerpo.propiedad.tieneCarpetaDrive, true);
    assert.equal(sin.cuerpo.propiedad.tieneCarpetaDrive, false);
    assert.ok(!JSON.stringify(con.cuerpo).includes(CARPETA));
    const dueno = await e.pedir("clienteA", "GET", `/v1/propiedades/${conCarpeta}`);
    assert.equal(dueno.cuerpo.propiedad.tieneCarpetaDrive, true);
    assert.deepEqual(clavesInternas(dueno.cuerpo), []);
  });

  test("idDeCarpeta saca el id de un enlace o de un id suelto", () => {
    assert.equal(idDeCarpeta(`https://drive.google.com/drive/folders/${CARPETA_VALIDA}?usp=sharing`), CARPETA_VALIDA);
    assert.equal(idDeCarpeta(`https://drive.google.com/drive/u/0/folders/${CARPETA_VALIDA}`), CARPETA_VALIDA);
    assert.equal(idDeCarpeta(` ${CARPETA_VALIDA} `), CARPETA_VALIDA);
    assert.equal(idDeCarpeta("hola"), null);
  });

  test("el equipo la enlaza con el enlace o el id, y queda guardado el id", async () => {
    respuestaDeCarpeta = { ok: true };
    revisadas = [];
    const r = await e.pedir("equipo", "PATCH", `/v1/propiedades/${sinCarpeta}`, {
      driveCarpetaId: `https://drive.google.com/drive/folders/${CARPETA_VALIDA}?usp=sharing`,
    });
    assert.equal(r.estado, 200, JSON.stringify(r.cuerpo));
    assert.equal(r.cuerpo.tieneCarpetaDrive, true);
    assert.deepEqual(revisadas, [CARPETA_VALIDA]);
    assert.equal((await db.property.findUniqueOrThrow({ where: { id: sinCarpeta } })).driveCarpetaId, CARPETA_VALIDA);

    // Con la carpeta enlazada, ya se puede subir.
    assert.equal((await e.pedir("equipo", "POST", `/v1/propiedades/${sinCarpeta}/documentos`, formularioPdf())).estado, 201);
    // Y un cambio común no la toca.
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/propiedades/${sinCarpeta}`, { edificio: "Torre" })).estado, 200);
    assert.equal((await db.property.findUniqueOrThrow({ where: { id: sinCarpeta } })).driveCarpetaId, CARPETA_VALIDA);
  });

  test("si la cuenta de servicio no la puede abrir, 400 con qué hacer y no se guarda", async () => {
    respuestaDeCarpeta = { ok: false, motivo: "No puedo abrir esa carpeta: compártela con el correo de la cuenta de servicio (cuenta@prueba) como editora." };
    const r = await e.pedir("equipo", "PATCH", `/v1/propiedades/${conCarpeta}`, { driveCarpetaId: CARPETA_VALIDA });
    assert.equal(r.estado, 400);
    assert.match(r.cuerpo.error.mensaje, /compártela con el correo de la cuenta de servicio/);
    assert.ok(r.cuerpo.error.campos.driveCarpetaId);
    assert.equal((await db.property.findUniqueOrThrow({ where: { id: conCarpeta } })).driveCarpetaId, CARPETA);
    respuestaDeCarpeta = { ok: true };
  });

  test("lo que no parece una carpeta da 400 sin llamar a Drive", async () => {
    revisadas = [];
    const r = await e.pedir("equipo", "PATCH", `/v1/propiedades/${conCarpeta}`, { driveCarpetaId: "no es un enlace" });
    assert.equal(r.estado, 400);
    assert.deepEqual(revisadas, []);
  });

  test("solo el equipo la cambia: un dueño, una llave o el cliente de otro no", async () => {
    const cuerpo = { driveCarpetaId: CARPETA_VALIDA };
    assert.equal((await e.pedir("clienteA", "PATCH", `/v1/propiedades/${conCarpeta}`, cuerpo)).estado, 403);
    assert.equal((await e.pedir("llaveA", "PATCH", `/v1/propiedades/${conCarpeta}`, cuerpo)).estado, 403);
    assert.equal((await e.pedir("clienteB", "PATCH", `/v1/propiedades/${conCarpeta}`, cuerpo)).estado, 404);
    assert.equal((await e.pedir("equipo", "PATCH", `/v1/propiedades/${deB}`, cuerpo)).estado, 200);
    // Un dueño sí cambia el resto de su ficha.
    assert.equal((await e.pedir("clienteA", "PATCH", `/v1/propiedades/${conCarpeta}`, { edificio: "Mi torre" })).estado, 200);
  });
});

describe("GET /v1/equipo", () => {
  test("lista a las personas activas del equipo por nombre, solo para el equipo", async () => {
    const r = await e.pedir("equipo", "GET", "/v1/equipo");
    assert.equal(r.estado, 200);
    const ids = r.cuerpo.items.map((p: { id: string }) => p.id);
    for (const id of [e.ids.equipo, e.ids.jefatura, e.ids.admin]) assert.ok(ids.includes(id));
    assert.ok(!ids.includes(e.ids.usuarioA), "los clientes no son del equipo");
    const nombres = r.cuerpo.items.map((p: { nombre: string }) => p.nombre);
    assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, "es")) , "ordenadas por nombre");
    const jefa = r.cuerpo.items.find((p: { id: string }) => p.id === e.ids.jefatura);
    assert.deepEqual(Object.keys(jefa).sort(), ["admin", "correo", "id", "jefatura", "nombre"]);
    assert.equal(jefa.jefatura, true);
    assert.equal(jefa.admin, false);
    assert.match(jefa.correo, /@prueba\.proges\.cl$/);
  });

  test("una persona desactivada no sale", async () => {
    await db.usuario.update({ where: { id: e.ids.jefatura }, data: { activo: false } });
    try {
      const r = await e.pedir("equipo", "GET", "/v1/equipo");
      assert.ok(!r.cuerpo.items.some((p: { id: string }) => p.id === e.ids.jefatura));
    } finally {
      await db.usuario.update({ where: { id: e.ids.jefatura }, data: { activo: true } });
    }
  });

  test("un dueño, una llave y un anónimo no la ven", async () => {
    assert.equal((await e.pedir("clienteA", "GET", "/v1/equipo")).estado, 403);
    assert.equal((await e.pedir("llaveA", "GET", "/v1/equipo")).estado, 403);
    assert.equal((await e.pedir("anonimo", "GET", "/v1/equipo")).estado, 401);
  });
});

describe("GET /v1/clientes/activos", () => {
  test("todo el equipo ve los clientes activos por nombre, solo con id y nombre", async () => {
    for (const quien of ["equipo", "jefatura", "admin"] as const) {
      const r = await e.pedir(quien, "GET", "/v1/clientes/activos");
      assert.equal(r.estado, 200, quien);
      const ids = r.cuerpo.items.map((c: { id: string }) => c.id);
      assert.ok(ids.includes(e.ids.clienteA) && ids.includes(e.ids.clienteB), quien);
      assert.ok(!ids.includes(ORG_PROGES), "Proges no es un cliente");
      for (const c of r.cuerpo.items) assert.deepEqual(Object.keys(c).sort(), ["id", "nombre"]);
      const nombres = r.cuerpo.items.map((c: { nombre: string }) => c.nombre);
      assert.deepEqual(nombres, [...nombres].sort((a, b) => a.localeCompare(b, "es")));
    }
  });

  test("un cliente desactivado no sale", async () => {
    await db.organizacion.update({ where: { id: e.ids.clienteB }, data: { activa: false } });
    try {
      const r = await e.pedir("equipo", "GET", "/v1/clientes/activos");
      assert.ok(!r.cuerpo.items.some((c: { id: string }) => c.id === e.ids.clienteB));
    } finally {
      await db.organizacion.update({ where: { id: e.ids.clienteB }, data: { activa: true } });
    }
  });

  test("un dueño, una llave y un anónimo no la ven", async () => {
    assert.equal((await e.pedir("clienteA", "GET", "/v1/clientes/activos")).estado, 403);
    assert.equal((await e.pedir("llaveA", "GET", "/v1/clientes/activos")).estado, 403);
    assert.equal((await e.pedir("anonimo", "GET", "/v1/clientes/activos")).estado, 401);
  });
});
