const code = '22 + x * GetValue(3 + y)';

console.log(Parse(Tokenizer(code)));

var importObject = {env:{}};
importObject.env.memory = new WebAssembly.Memory({ initial: 10, maximum: 10 });
importObject.env.Print = console.log;

var wasmBytes = Wasm([
    WasmImportFunc([], 'Print', [Valtype.i32])
], 
[
    WasmFunc(false, [], 'Test', [Valtype.i32], [], [
        Opcode.get_local, ...unsignedLEB128(0), Opcode.get_local, ...unsignedLEB128(0), Opcode.i32_mul, Opcode.call, ...unsignedLEB128(0), Opcode.end
    ]),
    WasmFunc(true, [], 'Main', [Valtype.i32], [], [
        Opcode.get_local, ...signedLEB128(0), Opcode.call, ...unsignedLEB128(1), Opcode.end
    ])
]);
WebAssembly.instantiate(wasmBytes, importObject).then(
    (obj) => {
        obj.instance.exports.Main(10);
    }
);