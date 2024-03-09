
function Tokenizer(code){
    function IsDigit(c){
        return c>='0' && c<='9';
    }

    function CreateLastToken(){
        if(split==false){
            var value = code.substring(start, i);
            var type = 'varname';
            if(IsDigit(value[0])){
                type = 'int';
                if(value.includes('.')){
                    type = 'float';
                }
            }
            tokens.push({type, start, end:i, code, value});
        }
        split=true;
    }

    const punctuation = '?:{}+-*/(),<>';
    const whitespace = ' \t\n\r';
    var tokens = [];
    var split = true;
    var start = 0;
    for(var i=0;i<code.length;i++){
        var c = code[i];
        if(whitespace.includes(c)){
            CreateLastToken();
        }
        else if(punctuation.includes(c)){
            CreateLastToken();
            tokens.push({type:'punctuation', start:i, end:i+1, code, value:c});
        }
        else{
            if(split){
                split=false;
                start=i;
            }
        }
    }
    CreateLastToken();
    return tokens;
}



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