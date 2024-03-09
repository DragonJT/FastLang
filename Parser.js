
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

function Parse(tokens){

    function ParseBraces(tokens){
        const braces = ['()', '{}', '[]'];    
        var i = 0;
        function ParseBraces(brace){
            var result = [];
            var start = i;
            for(;i<tokens.length;i++){
                var open = braces.find(b=>b[0] == tokens[i].value);
                var close = braces.find(b=>b[1] == tokens[i].value);
                if(open){
                    i++;
                    result.push({type:open, value:ParseBraces(open)});
                }
                else if(close){
                    if(close == brace){
                        return result;
                    }
                }
                else{
                    result.push(tokens[i]);
                }
            }
            if(start==0){
                return result;
            }
            else{
                throw "Missing closing brace: "+brace+start;
            }
        }
        return ParseBraces(tokens, 0);
    }

    function SplitByComma(tokens){
        var start = 0;
        var values = [];
        for(var i=0;i<tokens.length;i++){
            if(tokens[i].type == 'punctuation' && tokens[i].value == ','){
                values.push(tokens.slice(start, i));
                start=i+1;
            }
        }
        var last = tokens.slice(start);
        if(last.length>0){
            values.push(last);
        }
        return values;
    }

    function ParseExpression(tokens){
        const operatorGroups = [['?'], [':'], ['<', '>'], ['+', '-'], ['*', '/']];

        function TrySplit(operators){
            for(var i=tokens.length-1;i>=0;i--){
                var t = tokens[i];
                if(t.type == 'punctuation' && operators.includes(t.value)){
                    var left = ParseExpression(tokens.slice(0, i));
                    var right = ParseExpression(tokens.slice(i+1));
                    return new BinaryOpSyntax(left, right, t.value);
                }
            }
            return undefined;
        }

        function GetArgs(tokens){
            var argExpressions = SplitByComma(tokens);
            var output = [];
            for(var a of argExpressions){
                output.push(ParseExpression(a));
            }
            return output;
        }

        if(tokens.length == 1){
            var t = tokens[0];
            if(t.type == 'int'){
                return new IntConstSyntax(t.value);
            }
            else if(t.type == 'float'){
                return new FloatConstSyntax(t.value);
            }
            else if(t.type == 'varname'){
                return new IdentifierSyntax(t.value);
            }
            else{
                throw 'Unexpected token: '+JSON.stringify(t);
            }
        }
        else if(tokens.length == 2){
            var t1 = tokens[0];
            var t2 = tokens[1];
            if(t1.type == 'varname' && t2.type == '()'){
                return new CallSyntax(t1.value, GetArgs(t2.value));
            }
        }
        else{
            for(var operators of operatorGroups){
                var output = TrySplit(operators);
                if(output){
                    return output;
                }
            }
        }
        throw "Unexpected expression:"+JSON.stringify(tokens);
    }
   return ParseExpression(ParseBraces(tokens));
}