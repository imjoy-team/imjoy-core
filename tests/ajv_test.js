import { ajv } from "../src/imjoyCore.js";
import { expect } from "chai";

describe("ajv", async () => {
  let schema;
  const data = {
    mydata: {
      _rtype: "ndarray",
      _rvalue: new Uint8Array(new ArrayBuffer(100)),
      _rshape: [10, 10],
      _rdtype: "uint8",
    },
    myfile: new File(["foo"], "foo.txt", {
      type: "text/plain",
    }),
  };
  it("should validate ndarray", async () => {
    // correct shape
    schema = {
      properties: {
        mydata: { ndarray: { shape: [10, 10] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // wrong shape
    schema = {
      properties: {
        mydata: { ndarray: { shape: [20, 10] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // wrong dtype
    schema = {
      properties: {
        mydata: { ndarray: { dtype: "float32" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // correct dtype
    schema = {
      properties: {
        mydata: { ndarray: { dtype: "uint8" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // correct dtype list
    schema = {
      properties: {
        mydata: { ndarray: { dtype: ["uint8", "float32"] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // wrong ndim
    schema = {
      properties: {
        mydata: { ndarray: { ndim: 3 } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // correct ndim
    schema = {
      properties: {
        mydata: { ndarray: { ndim: 2 } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // correct ndim list
    schema = {
      properties: {
        mydata: { ndarray: { ndim: [2, 3] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // wrong ndim list
    schema = {
      properties: {
        mydata: { ndarray: { ndim: [1, 3] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // simple array
    schema = { ndarray: {} };
    expect(
      ajv.compile(schema)({
        _rtype: "ndarray",
        _rvalue: new Uint8Array(new ArrayBuffer(10)),
        _rshape: [1, 10],
        _rdtype: "uint8",
      })
    ).to.be.true;

    // undefined shape
    schema = { ndarray: { shape: [null, null] } };
    expect(
      ajv.compile(schema)({
        _rtype: "ndarray",
        _rvalue: new Uint8Array(new ArrayBuffer(10)),
        _rshape: [1, 10],
        _rdtype: "uint8",
      })
    ).to.be.true;
  });

  it("should validate file", async () => {
    // correct mime
    schema = {
      properties: {
        myfile: { file: { mime: "text/plain" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // correct mime list
    schema = {
      properties: {
        myfile: { file: { mime: ["text/plain", "image/png"] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;
    // wrong mime
    schema = {
      properties: {
        myfile: { file: { mime: "image/png" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // wrong ext
    schema = {
      properties: {
        myfile: { file: { ext: "png" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.false;

    // correct ext
    schema = {
      properties: {
        myfile: { file: { ext: "txt" } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;

    // correct ext list
    schema = {
      properties: {
        myfile: { file: { ext: ["txt", "png"] } },
      },
    };
    expect(ajv.compile(schema)(data)).to.be.true;
  });
});
