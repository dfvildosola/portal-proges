// Borrar una propiedad: sus documentos se van en cascada de la base, y sus PDF a la papelera de
// Drive. Si Drive falla, la propiedad igual se borra (el PDF suelto queda anotado en el registro).
import assert from "node:assert/strict";
import { after, before, describe, test } from "node:test";
import { db, ORG_PROGES } from "@proges/db";
import { crearEscenario, type Escenario } from "./ayuda";

const unico = `${process.pid}${Date.now().toString(36)}`;
const enPapelera: string[] = [];
let driveCaido = false;

let e: Escenario;

before(async () => {
  e = await crearEscenario({
    drive: {
      borrarArchivo: async (id) => {
        if (driveCaido) throw new Error("Drive no responde (prueba).");
        enPapelera.push(id);
      },
    },
  });
});
after(() => e.limpiar());

async function propiedadConDocumentos(clave: string, blobKeys: string[]): Promise<string> {
  const p = await db.property.create({
    data: { organizationId: e.ids.clienteA, tipo: "CASA", direccion: `Calle ${clave} ${unico}`, comuna: "Ñuñoa", region: "RM" },
  });
  for (const [i, blobKey] of blobKeys.entries()) {
    await db.document.create({
      data: { organizationId: e.ids.clienteA, propertyId: p.id, tipo: "OTRO", nombre: `Papel ${i}`, blobKey },
    });
  }
  return p.id;
}

describe("DELETE /v1/propiedades/{id} y Drive", () => {
  test("manda a la papelera los PDF de sus documentos (no los de antes de Drive)", async () => {
    const pdfA = `pdf_a_${unico}_abcdef`;
    const pdfB = `pdf_b_${unico}_abcdef`;
    const id = await propiedadConDocumentos("con-pdf", [pdfA, pdfB, "https://almacen-viejo.example/x.pdf"]);
    const r = await e.pedir("clienteA", "DELETE", `/v1/propiedades/${id}`);
    assert.equal(r.estado, 204);
    assert.equal(await db.property.count({ where: { id } }), 0);
    assert.deepEqual(enPapelera.filter((x) => x.endsWith(unico + "_abcdef")).sort(), [pdfA, pdfB].sort());
  });

  test("si Drive falla, la propiedad se borra igual y no queda a medias", async () => {
    const id = await propiedadConDocumentos("drive-caido", [`pdf_c_${unico}_abcdef`]);
    driveCaido = true;
    try {
      const r = await e.pedir("clienteA", "DELETE", `/v1/propiedades/${id}`);
      assert.equal(r.estado, 204);
    } finally {
      driveCaido = false;
    }
    assert.equal(await db.property.count({ where: { id } }), 0);
    assert.equal(await db.document.count({ where: { propertyId: id } }), 0);
  });

  test("con servicios no se borra y no se toca ningún PDF", async () => {
    const pdf = `pdf_d_${unico}_abcdef`;
    const id = await propiedadConDocumentos("con-servicio", [pdf]);
    const catalogo = await db.servicio.create({
      data: { organizationId: ORG_PROGES, codigo: `BORR-${unico}`, familia: "RR", nombre: `Servicio ${unico}` },
    });
    await db.servicioEnCurso.create({
      data: { organizationId: e.ids.clienteA, propertyId: id, servicioId: catalogo.id, tipo: "OBRA", responsableId: e.ids.equipo },
    });
    try {
      const r = await e.pedir("clienteA", "DELETE", `/v1/propiedades/${id}`);
      assert.equal(r.estado, 409);
      assert.ok(!enPapelera.includes(pdf));
      assert.equal(await db.document.count({ where: { propertyId: id } }), 1);
    } finally {
      await db.servicioEnCurso.deleteMany({ where: { propertyId: id } });
      await db.servicio.delete({ where: { id: catalogo.id } });
    }
  });
});
