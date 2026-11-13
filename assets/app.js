const $=x=>document.getElementById(x);let key="",last="",lastShareText="",lastExpression="";
const HISTORY_KEY="cf-history-v1";
let history=[];
function readStoredJSON(storageKey,fallback){try{const value=JSON.parse(localStorage.getItem(storageKey)||"null");return value===null?fallback:value;}catch(e){return fallback;}}
const savedHistory=readStoredJSON(HISTORY_KEY,[]);
if(Array.isArray(savedHistory))history=savedHistory.filter(x=>x&&typeof x==="object").slice(-50);
const savedFavs=readStoredJSON("cf-favs",[]),favs=Array.isArray(savedFavs)?savedFavs:[];
const originalCards=Array.from(document.querySelectorAll("#cards .card"));
const names={basic:"Calculadora básica",percent:"Porcentagem",discount:"Desconto",rule:"Regra de três",average:"Média simples",increase:"Reajuste / acréscimo",sci:"Calculadora científica",grades:"Notas escolares",interest:"Juros simples e compostos"};
function updateFavs(){
  document.querySelectorAll(".card").forEach(c=>{
    let k=c.dataset.k,b=c.querySelector(".fav"),isFav=favs.includes(k);
    if(!b){b=document.createElement("button");b.type="button";b.className="fav";c.append(b)}
    b.textContent=isFav?"★":"☆";
    b.title=isFav?"Remover dos favoritos":"Adicionar aos favoritos";
    b.setAttribute("aria-label",(isFav?"Remover ":"Adicionar ")+(names[k]||k)+(isFav?" dos favoritos":" aos favoritos"));
    b.setAttribute("aria-pressed",isFav?"true":"false");
    c.classList.toggle("is-favorite",isFav);
  });
  // Mantém os cards favoritos fixados no começo da grade, sem perder a ordem original dos demais.
  const ordered=originalCards.slice().sort((a,b)=>{
    const ai=favs.indexOf(a.dataset.k),bi=favs.indexOf(b.dataset.k);
    if(ai>=0&&bi>=0)return ai-bi;
    if(ai>=0)return -1;
    if(bi>=0)return 1;
    return originalCards.indexOf(a)-originalCards.indexOf(b);
  });
  const fragment=document.createDocumentFragment();
  ordered.forEach(card=>fragment.appendChild(card));
  $("cards").appendChild(fragment);

  const list=$("favList");list.innerHTML="";
  favs.forEach(k=>{
    let li=document.createElement("li"),label=document.createElement("span"),button=document.createElement("button");
    label.textContent=names[k]||k;button.type="button";button.className="list-action";button.textContent="Abrir";
    button.setAttribute("aria-label","Abrir "+(names[k]||k));button.addEventListener("click",()=>open(k));li.append(label,button);list.append(li);
  });
  if(!favs.length){let li=document.createElement("li");li.textContent="Você ainda não favoritou nenhuma calculadora.";list.append(li)}
}
function persistHistory(){
  history=history.slice(-50);
  try{localStorage.setItem(HISTORY_KEY,JSON.stringify(history));}catch(e){/* Histórico continua disponível nesta sessão. */}
}
function captureInputValues(){
  const values={};
  $("fields").querySelectorAll("input,select").forEach(el=>{values[el.id.replace(/^f/,"")]=el.value;});
  return values;
}
function saveHistoryItem(k,result,expression,inputs){
  history.push({key:k,name:names[k]||k,expression:String(expression||""),result:String(result),inputs:inputs&&typeof inputs==="object"?inputs:{},createdAt:new Date().toISOString()});
  persistHistory();updateHistory();
}
function repeatHistoryItem(item){
  if(!item||!item.key||!configs[item.key])return;
  open(item.key);
  if(item.key==="basic"){
    const expression=(item.inputs&&item.inputs.expression)||item.expression||"";
    basicExpr=expression;basicDone=false;
    $("basicExpression").textContent=expression||"0";
    $("basicOutput").textContent=expression||"0";
    $("hint").textContent=expression?"Conta recuperada. Pressione = para calcular novamente.":"Este cálculo antigo não possui a expressão completa salva.";
    return;
  }
  const values=item.inputs&&typeof item.inputs==="object"?item.inputs:{};
  const keys=Object.keys(values);
  keys.forEach(id=>{const field=$("f"+id);if(field)field.value=String(values[id]);});
  if(activeFieldId)updateFormScreen();
  $("hint").textContent=keys.length?"Valores recuperados do histórico. Você pode alterá-los e calcular novamente.":"Este cálculo antigo não possui os valores originais salvos. Preencha os campos para calcular novamente.";
}
function updateHistory(){
  const ul=$("historyList");ul.innerHTML="";
  history.slice().reverse().forEach(item=>{
    const li=document.createElement("li"),wrap=document.createElement("span"),name=document.createElement("strong"),formula=document.createElement("span"),result=document.createElement("span"),meta=document.createElement("small"),button=document.createElement("button");
    wrap.className="history-item";name.textContent=item.name||names[item.key]||"Cálculo";
    formula.className="history-expression";formula.textContent=item.expression||"Conta detalhada não disponível para este cálculo antigo.";
    result.className="history-result";result.textContent="Resultado: "+(item.result||"—");
    const date=item.createdAt?new Date(item.createdAt):null;
    meta.textContent=date&&!Number.isNaN(date.getTime())?date.toLocaleString("pt-BR"):"Data não disponível";
    wrap.append(name,formula,result,meta);
    button.type="button";button.className="list-action";button.textContent="Repetir cálculo";
    button.setAttribute("aria-label","Repetir cálculo de "+(item.name||"calculadora"));
    button.addEventListener("click",()=>repeatHistoryItem(item));
    li.append(wrap,button);ul.append(li);
  });
  if(!history.length){let li=document.createElement("li");li.textContent="Nenhum cálculo salvo ainda.";ul.append(li)}
}
async function copyText(text,successMessage){
  if(!text){$("hint").textContent="Faça um cálculo antes de copiar.";return;}
  try{
    if(navigator.clipboard&&navigator.clipboard.writeText){await navigator.clipboard.writeText(text);}
    else throw new Error("Clipboard API indisponível");
    $("hint").textContent=successMessage||"Texto copiado!";
  }catch(e){
    try{
      const area=document.createElement("textarea");area.value=text;area.setAttribute("readonly","");area.style.position="fixed";area.style.opacity="0";document.body.appendChild(area);area.select();
      const copied=document.execCommand("copy");document.body.removeChild(area);
      $("hint").textContent=copied?(successMessage||"Texto copiado!"):"Não foi possível copiar automaticamente neste navegador.";
    }catch(err){$("hint").textContent="Não foi possível copiar automaticamente neste navegador.";}
  }
}
function shareContent(title,text){
  const payload={title:title,text:text,url:location.href};
  if(navigator.share){return navigator.share(payload).catch(()=>{});}
  if(navigator.clipboard&&navigator.clipboard.writeText){return navigator.clipboard.writeText(text).then(()=>{$("hint").textContent="Resultado copiado. Agora você pode colar onde quiser.";}).catch(()=>{$("hint").textContent="Não foi possível copiar automaticamente neste navegador.";});}
  $("hint").textContent="O compartilhamento não está disponível neste navegador.";
}


const learningGuides={
basic:{title:"Como fazer contas básicas?",text:"A adição junta valores; a subtração encontra a diferença; a multiplicação reúne parcelas iguais; e a divisão reparte um total em partes iguais.",steps:["Digite o primeiro número no visor.","Escolha +, −, × ou ÷ e informe o segundo número.","Pressione = para ver o resultado. Na divisão, o segundo número não pode ser zero."],example:"Exemplos: 8 + 4 = 12; 12 ÷ 3 = 4",url:"/como-fazer-contas-basicas/"},
percent:{title:"Como calcular porcentagem?",text:"Porcentagem representa uma parte de cada 100. Para encontrar uma taxa percentual de um valor, multiplique o valor pela taxa e divida por 100.",steps:["Identifique o valor total e a porcentagem desejada.","Multiplique o valor total pela porcentagem.","Divida o resultado por 100."],example:"Exemplo: 20% de 150 → 150 × 20 ÷ 100 = 30",url:"/como-calcular-porcentagem/"},
discount:{title:"Como calcular um desconto?",text:"O desconto é uma parte do preço original. Primeiro descubra quanto será descontado e depois subtraia esse valor do preço inicial.",steps:["Calcule o desconto: preço × porcentagem ÷ 100.","Subtraia o desconto do preço original.","O resultado é o preço final a pagar."],example:"Exemplo: 10% de R$ 200 = R$ 20 de desconto; preço final: R$ 180",url:"/como-calcular-desconto/"},
rule:{title:"Como resolver regra de três?",text:"A regra de três ajuda a encontrar um valor desconhecido quando existe uma relação proporcional entre as grandezas. Organize os valores na mesma ordem antes de calcular.",steps:["Monte a relação com três valores conhecidos e um valor desconhecido (X).","Multiplique os valores em cruz conforme a proporção.","Divida pelo valor que ficou junto de X."],example:"Exemplo: 2 cadernos custam R$ 10; 4 cadernos custam X → X = (10 × 4) ÷ 2 = R$ 20",url:"/como-resolver-regra-de-tres/"},
average:{title:"Como calcular média simples?",text:"A média simples distribui igualmente o total entre os valores. Some todos os números e divida pela quantidade de números informados.",steps:["Some todos os valores.","Conte quantos valores foram somados.","Divida a soma pela quantidade."],example:"Exemplo: (6 + 8 + 10) ÷ 3 = 24 ÷ 3 = 8",url:"/como-calcular-media-simples/"},
increase:{title:"Como calcular aumento percentual?",text:"O aumento percentual mostra quanto um valor cresceu em relação ao valor inicial. Calcule o acréscimo e some-o ao valor original.",steps:["Calcule o acréscimo: valor inicial × porcentagem ÷ 100.","Some o acréscimo ao valor inicial.","O total é o novo valor após o reajuste."],example:"Exemplo: aumento de 10% sobre R$ 200 é R$ 20; novo valor: R$ 220",url:"/como-calcular-aumento-percentual/"},
sci:{title:"Como usar a calculadora científica?",text:"A calculadora científica realiza operações como potência, raiz quadrada, seno, cosseno, tangente e logaritmo de base 10. As funções trigonométricas deste site recebem ângulos em graus.",steps:["Escolha a função no campo Operação.","Informe o número e, quando necessário, o expoente.","Pressione Calcular para ver o resultado. Para raiz e log, respeite o domínio matemático da função."],example:"Exemplos: √81 = 9; 2³ = 8; seno de 30° = 0,5",url:"/como-usar-calculadora-cientifica/"},
grades:{title:"Como calcular a nota para passar?",text:"A média atual é calculada somando as três notas e dividindo por três. A estimativa da próxima nota considera quatro avaliações com o mesmo peso; confira se essa regra corresponde ao critério da sua escola.",steps:["Informe as três notas que você já recebeu.","Digite a média desejada.","A calculadora mostra a média atual e a nota necessária em uma quarta avaliação de mesmo peso."],example:"Exemplo: notas 6, 7 e 8 → média atual = 7. Para média 7 em quatro notas, precisa de 7 na próxima.",url:"/como-calcular-nota-para-passar/"},
interest:{title:"Como calcular juros simples e compostos?",text:"Nos juros simples, a taxa incide sempre sobre o capital inicial. Nos juros compostos, os juros entram no saldo e passam a render nos períodos seguintes.",steps:["Informe o capital inicial, a taxa por período e a quantidade de períodos.","Escolha juros simples ou compostos.","Compare o montante final. A taxa e o tempo precisam usar o mesmo período (por exemplo, taxa mensal e número de meses)."],example:"Exemplo: R$ 100 a 10% por 2 períodos: simples = R$ 120; compostos = R$ 121",url:"/como-calcular-juros-simples-e-compostos/"}
};
const configs={basic:["Calculadora básica","a:Primeiro número|op:Operação:select:Somar,Subtrair,Multiplicar,Dividir|b:Segundo número"],percent:["Porcentagem","p:Porcentagem (%)|v:Valor"],discount:["Desconto","v:Preço original (R$)|p:Desconto (%)"],rule:["Regra de três","a:Valor A|b:Valor B|c:Valor C"],average:["Média simples","nums:Números separados por vírgula:text"],increase:["Reajuste / acréscimo","v:Valor inicial (R$)|p:Aumento (%)"],sci:["Calculadora científica","op:Operação:select:Quadrado,Raiz quadrada,Potência,Seno (graus),Cosseno (graus),Tangente (graus),Log base 10|a:Número|b:Expoente (para potência)"],grades:["Notas escolares","n1:Nota 1|n2:Nota 2|n3:Nota 3|goal:Média desejada"],interest:["Juros simples e compostos","capital:Capital inicial (R$)|rate:Taxa por período (%)|time:Quantidade de períodos|kind:Tipo:select:Simples,Compostos"]};
let basicExpr="",basicDone=false,activeFieldId="";
function updateFormScreen(){
  const field=activeFieldId?$("f"+activeFieldId):null;
  const wrap=field?.closest(".field");
  document.querySelectorAll(".field").forEach(x=>x.classList.remove("active-field"));
  if(wrap)wrap.classList.add("active-field");
  $("activeLabel").textContent=wrap?.querySelector("label")?.textContent||"Campo selecionado";
  const value=field?.value??"";
  $("activeValue").textContent=(value?(key==="average"?value:value.replace(".",",")):"Digite usando o teclado");
}
function setActiveField(id){activeFieldId=id;updateFormScreen()}
function open(k){
  if (typeof window.gtag === "function") {
    window.gtag("event", "calculator_open", {
      calculator_id: k,
      calculator_name: names[k] || k
    });
  }
  key=k;
  document.body.classList.add("calc-open");
  const guide=learningGuides[k];
  if(guide){
    $("learningTitle").textContent=guide.title;
    $("learningText").textContent=guide.text;
    $("learningExample").textContent=guide.example;
    $("learningLink").href=guide.url;
    const steps=$("learningSteps");steps.innerHTML="";
    (guide.steps||[]).forEach(step=>{const li=document.createElement("li");li.textContent=step;steps.append(li);});
  }
  let [t,fs]=configs[k];$("title").textContent=t;
  const isBasic=k==="basic";
  $("basicUI").style.display=isBasic?"block":"none";
  $("formUI").style.display=isBasic?"none":"block";
  $("formKeypadUI").style.display=isBasic?"none":"block";
  $("standardActions").style.display=isBasic?"none":"flex";
  $("fields").style.display=isBasic?"none":"grid";
  if(isBasic){basicExpr="";basicDone=false;$("basicExpression").textContent="0";$("basicOutput").textContent="0";}
  $("fields").innerHTML="";activeFieldId="";
  fs.split("|").forEach(s=>{
    let [id,label,type,opts]=s.split(":");let d=document.createElement("div");d.className="field";
    let l=document.createElement("label");l.textContent=label;l.htmlFor="f"+id;let e;
    if(type==="select"){
      e=document.createElement("select");opts.split(",").forEach((v,i)=>{let o=document.createElement("option");o.value=i;o.textContent=v;e.append(o)});
    }else{
      e=document.createElement("input");e.type="text";e.inputMode="none";e.readOnly=true;e.autocomplete="off";e.placeholder=type==="text"?"Ex.: 7.5; 8; 9.5":"Toque para selecionar";
      if(!activeFieldId)activeFieldId=id;
    }
    e.id="f"+id;d.append(l,e);$("fields").append(d);
    if(type!=="select"){
      d.addEventListener("click",()=>setActiveField(id));
      e.addEventListener("focus",()=>setActiveField(id));
    }
  });
  $("hint").textContent=isBasic?"Use o teclado para fazer suas contas.":(k==="average"?"Separe os números com ponto e vírgula (;). Os decimais usam ponto: 7.5 e não 7,5. O botão \",\" insere o separador.":"Selecione um campo e use o teclado para preencher. Toque em Próximo para avançar.");
  $("result").style.display="none";$("shareResult").hidden=true;$("shareBasic").hidden=true;$("copyFull").hidden=true;$("copyBasicResult").hidden=true;$("copyBasicFull").hidden=true;lastShareText="";lastExpression="";$("cards").style.display="none";$("calc").style.display="block";
  if(!isBasic)updateFormScreen();
  $("calc").scrollIntoView({behavior:"smooth",block:"start"});
}
function n(id){let e=$("f"+id),v=Number(e.value);if(!e.value.trim()||!Number.isFinite(v))throw Error("Preencha todos os campos com valores válidos.");return v}function f(v){return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:8}).format(v)}
function run(){try{let r,d="",cash=false,expression="";switch(key){
case"basic":{let a=n("a"),b=n("b"),o=+$("fop").value;if(o===3&&b===0)throw Error("Não é possível dividir por zero.");r=[a+b,a-b,a*b,a/b][o];d="Operação realizada com os dois números informados.";break}
case"percent":{let p=n("p"),v=n("v");r=v*p/100;expression=f(p)+"% de "+f(v);d=f(p)+"% de "+f(v);break}
case"discount":{let v=n("v"),p=n("p");if(v<0||p<0||p>100)throw Error("Desconto deve ficar entre 0% e 100%.");r=v*(1-p/100);cash=true;expression="Desconto de "+f(p)+"% sobre R$ "+f(v);d="Você economiza R$ "+f(v*p/100);break}
case"rule":{let a=n("a"),b=n("b"),c=n("c");if(!a)throw Error("Valor A não pode ser zero.");r=b*c/a;expression="("+f(b)+" × "+f(c)+") ÷ "+f(a);d="X = (B × C) ÷ A";break}
case"average":{let s=$("fnums").value.trim(),sep=s.includes(";")?";":(s.includes(" ")&&!s.includes(",")?" ":","),a=s.split(sep).map(x=>x.trim()).filter(x=>x!=="").map(Number);if(!s||!a.length||a.some(x=>!Number.isFinite(x)))throw Error("Digite números separados por ponto e vírgula. Decimais usam ponto.");r=a.reduce((x,y)=>x+y,0)/a.length;expression="Média de: "+a.map(f).join(", ");d="Soma dividida pela quantidade de números ("+a.length+").";break}
case"increase":{let v=n("v"),p=n("p");if(v<0||p<0)throw Error("Use valores positivos.");r=v*(1+p/100);cash=true;expression="Aumento de "+f(p)+"% sobre R$ "+f(v);d="Aumento aplicado: R$ "+f(v*p/100);break}
case"sci":{let a=n("a"),o=+$("fop").value,rad=a*Math.PI/180,opNames=["Quadrado","Raiz quadrada","Potência","Seno","Cosseno","Tangente","Log base 10"];if(o===1&&a<0||o===6&&a<=0)throw Error("Essa operação exige um número positivo.");if(o===5&&Math.abs(Math.cos(rad))<1e-10)throw Error("Tangente não definida para esse ângulo.");let b=o===2?n("b"):null;r=[a*a,Math.sqrt(a),Math.pow(a,b),Math.sin(rad),Math.cos(rad),Math.tan(rad),Math.log10(a)][o];expression=opNames[o]+" de "+f(a)+(o===2?" elevado a "+f(b):[3,4,5].includes(o)?"°":"");d="Resultado da operação científica escolhida.";break}
case"grades":{let a=n("n1"),b=n("n2"),c=n("n3"),g=n("goal");r=(a+b+c)/3;expression="Notas "+[a,b,c].map(f).join(", ")+"; meta desejada: "+f(g);let need=g*4-a-b-c;d="Média atual: "+f(r)+". "+(need<=0?"Meta garantida: você já alcançou essa média.":(r>=g?"Meta atingida! ":"")+(need>10?"Com uma única prova, mesmo tirando 10, não dá para chegar a essa média.":"Para média "+f(g)+" em 4 avaliações de mesmo peso, precisa tirar "+f(need)+" na próxima nota."));break}
case"interest":{let c=n("capital"),rate=n("rate")/100,t=n("time"),o=+$("fkind").value;if(c<0||rate<0||t<0)throw Error("Use valores iguais ou maiores que zero.");r=o===0?c*(1+rate*t):c*Math.pow(1+rate,t);cash=true;expression=(o===0?"Juros simples":"Juros compostos")+" sobre R$ "+f(c)+", taxa de "+f(rate*100)+"% por "+f(t)+" período(s)";d="Juros acumulados: R$ "+f(r-c);break}}
if(!Number.isFinite(r))throw Error("Não foi possível calcular.");last=f(r)+(cash?" (R$)":"");lastExpression=expression;saveHistoryItem(key,last,expression,captureInputValues());lastShareText="Resultado no CalculaFácil\n"+(names[key]||"Calculadora")+"\n"+(expression?"Conta: "+expression+"\n":"")+"Resultado: "+last+"\nAcesse: "+location.href;$("value").textContent=last;$("explain").textContent=d;$("result").style.display="block";$("copyFull").hidden=false;$("shareResult").hidden=false;$("result").style.background="#effaf4";$("result").style.color="#087443";$("result").style.borderColor="#c8ead7"
}catch(e){last="";lastShareText="";lastExpression="";$("shareResult").hidden=true;$("copyFull").hidden=true;$("value").textContent=e.message;$("explain").textContent="Confira os campos e tente novamente.";$("result").style.display="block";$("result").style.background="#fff5f5";$("result").style.color="#b42318";$("result").style.borderColor="#fecdca"}}
function basicFormat(v){return new Intl.NumberFormat("pt-BR",{maximumFractionDigits:8}).format(v)}
function basicText(r){let s=String(r);if(!s.includes("e")||Math.abs(r)>=1e21)return s;let t=Number(r).toFixed(10);if(t.includes("."))t=t.replace(/0+$/,"").replace(/\.$/,"");return t===""||t==="-0"?"0":t}
function basicEval(expr){let m=expr.match(/^(-?\d+(?:\.\d+)?)([+\-×÷])(-?\d+(?:\.\d+)?)$/);if(!m)return null;let a=Number(m[1]),b=Number(m[3]),r;switch(m[2]){case "+":r=a+b;break;case "-":r=a-b;break;case "×":r=a*b;break;case "÷":if(b===0)throw Error("Não é possível dividir por zero.");r=a/b;break}return Number(r.toPrecision(12))}
function basicPress(k){let out=$("basicOutput"),exp=$("basicExpression");if(k==="clear"){basicExpr="";basicDone=false;$("shareBasic").hidden=true;$("copyBasicResult").hidden=true;$("copyBasicFull").hidden=true;lastShareText="";lastExpression="";last="";exp.textContent="0";out.textContent="0";return}if(k==="back"){basicExpr=basicExpr.slice(0,-1);basicDone=false;exp.textContent=basicExpr||"0";out.textContent=basicExpr||"0";return}if(k==="sign"){let m=basicExpr.match(/(-?\d+(?:\.\d+)?)$/);if(m){let v=m[1].startsWith("-")?m[1].slice(1):"-"+m[1];basicExpr=basicExpr.slice(0,m.index)+v}else if(!basicExpr)basicExpr="-";exp.textContent=basicExpr||"0";out.textContent=basicExpr||"0";return}if(k==="%"){let m=basicExpr.match(/(-?\d+(?:\.\d+)?)$/);if(m){let pct=Number((Number(m[1])/100).toPrecision(12)),v=basicText(pct);basicExpr=basicExpr.slice(0,m.index)+v;exp.textContent=basicExpr;out.textContent=basicFormat(pct)}return}if(k==="="){let expression=basicExpr;let r=basicEval(basicExpr);if(r===null)return;exp.textContent=expression+" =";out.textContent=basicFormat(r);basicExpr=basicText(r);basicDone=true;last=basicFormat(r);lastExpression=expression;saveHistoryItem("basic",last,expression,{expression:expression});lastShareText="Conta no CalculaFácil\n"+expression+" = "+last+"\nAcesse: "+location.href;$("copyBasicResult").hidden=false;$("copyBasicFull").hidden=false;$("shareBasic").hidden=false;return}if("+-×÷".includes(k)){if(!basicExpr||/[+\-×÷.]$/.test(basicExpr))return;let r=basicEval(basicExpr);if(r!==null)basicExpr=basicText(r);basicExpr+=k;basicDone=false}else{if(basicDone){basicExpr="";basicDone=false}if(k==="."&&/\.\d*$/.test(basicExpr.split(/[+\-×÷]/).pop()))return;if(basicExpr.length>24)return;basicExpr+=k}exp.textContent=basicExpr||"0";out.textContent=basicExpr||"0"}
function formKeyPress(k){
  if(k==="next"){
    const inputs=[...$("fields").querySelectorAll("input")];
    if(!inputs.length)return;
    const i=inputs.findIndex(x=>x.id==="f"+activeFieldId);
    setActiveField(inputs[(i+1)%inputs.length].id.slice(1));return;
  }
  const field=activeFieldId?$("f"+activeFieldId):null;
  if(!field)return;
  let value=field.value||"";
  if(k==="clear")value="";
  else if(k==="back")value=value.slice(0,-1);
  else if(k==="sign"){
    if(key==="average"){
      const cut=Math.max(value.lastIndexOf(";"),value.lastIndexOf(","),value.lastIndexOf(" "))+1;
      const head=value.slice(0,cut),lastPart=value.slice(cut);
      value=head+(lastPart.startsWith("-")?lastPart.slice(1):"-"+lastPart);
    }else value=value.startsWith("-")?value.slice(1):"-"+value;
  }else if(k===","){
    if(key==="average"){
      if(!/[;,]\s*$/.test(value)&&value.length<70)value+="; ";
    }else if(!value.includes(".")&&value.length<70)value+=".";
  }else if(k==="."){
    const lastPart=key==="average"?(value.split(/[;,\s]/).pop()||""):value;
    if(!lastPart.includes(".")&&value.length<70)value+=".";
  }else if(/^\d$/.test(k)&&value.length<70){value+=k;}
  field.value=value;
  updateFormScreen();
}
$("formKeys").onclick=e=>{const b=e.target.closest("[data-form-key]");if(b)formKeyPress(b.dataset.formKey)};
$("basicKeys").onclick=e=>{let b=e.target.closest("[data-key]");if(b)try{basicPress(b.dataset.key)}catch(err){$("basicOutput").textContent=err.message}};
$("cards").addEventListener("click",e=>{const favButton=e.target.closest(".fav");if(favButton){const card=favButton.closest(".card");if(!card)return;const k=card.dataset.k;const i=favs.indexOf(k);if(i>=0)favs.splice(i,1);else favs.push(k);try{localStorage.setItem("cf-favs",JSON.stringify(favs));}catch(err){/* Favoritos continuam nesta sessão. */}updateFavs();return}const openButton=e.target.closest(".card-open");if(openButton){const card=openButton.closest(".card");if(card)open(card.dataset.k)}});
function applyTheme(isDark){
  document.body.classList.toggle("dark",!!isDark);
  $("theme").textContent=isDark?"☀️ Modo claro":"🌙 Modo escuro";
  $("theme").setAttribute("aria-pressed",isDark?"true":"false");
}
function initializeTheme(){
  let stored=null;try{stored=localStorage.getItem("cf-dark");}catch(e){}
  const systemDark=!!(window.matchMedia&&window.matchMedia("(prefers-color-scheme: dark)").matches);
  applyTheme(stored===null?systemDark:stored==="1");
  if(stored===null&&window.matchMedia){
    const media=window.matchMedia("(prefers-color-scheme: dark)");
    const followSystem=event=>{try{if(localStorage.getItem("cf-dark")===null)applyTheme(event.matches);}catch(e){applyTheme(event.matches);}};
    if(media.addEventListener)media.addEventListener("change",followSystem);else if(media.addListener)media.addListener(followSystem);
  }
}
$("theme").onclick=()=>{const dark=!document.body.classList.contains("dark");try{localStorage.setItem("cf-dark",dark?"1":"0");}catch(e){}applyTheme(dark);};
initializeTheme();
$("showFav").onclick=()=>{$("favPanel").style.display=$("favPanel").style.display==="block"?"none":"block";updateFavs()};
$("showHistory").onclick=()=>{$("historyPanel").style.display=$("historyPanel").style.display==="block"?"none":"block";updateHistory()};
$("clearHistory").onclick=()=>{history=[];try{localStorage.removeItem(HISTORY_KEY)}catch(e){}updateHistory()};
$("share").onclick=()=>shareContent("CalculaFácil","Conheça o CalculaFácil: "+location.href);
$("shareResult").onclick=()=>{if(lastShareText)shareContent("Resultado do CalculaFácil",lastShareText)};
$("shareBasic").onclick=()=>{if(lastShareText)shareContent("Conta do CalculaFácil",lastShareText)};
$("copyBasicResult").onclick=()=>copyText(last,"Resultado copiado!");
$("copyBasicFull").onclick=()=>copyText(lastExpression+" = "+last,"Conta e resultado copiados!");
$("copyFull").onclick=()=>copyText((names[key]||"Calculadora")+"\n"+(lastExpression?"Conta: "+lastExpression+"\n":"")+"Resultado: "+last,"Conta e resultado copiados!");
updateFavs();updateHistory();$("go").onclick=run;
$("clear").onclick=()=>{$("fields").querySelectorAll("input").forEach(e=>e.value="");$("fields").querySelectorAll("select").forEach(e=>e.selectedIndex=0);$("result").style.display="none";$("shareResult").hidden=true;$("copyFull").hidden=true;last="";lastExpression="";lastShareText="";updateFormScreen()};
$("copy").onclick=()=>copyText(last,"Resultado copiado!");
$("back").onclick=()=>{$("calc").style.display="none";$("cards").style.display="grid";document.body.classList.remove("calc-open");$("cards").scrollIntoView({behavior:"smooth",block:"start"})};
$("search").oninput=e=>{let q=e.target.value.toLowerCase();$("cards").querySelectorAll(".card").forEach(c=>c.style.display=c.innerText.toLowerCase().includes(q)?"":"none")};
document.addEventListener("keydown",function(ev){
  const calc=$("calc");
  if(!calc||calc.style.display!=="block")return;
  if(ev.ctrlKey||ev.metaKey||ev.altKey)return;
  const t=ev.target;
  if(t&&t.closest&&t.closest("#search,select,textarea,a,.cf-menu-wrap,#cf-analytics-consent,footer"))return;
  const k=ev.key;
  if(key==="basic"){
    let action=null;
    if(/^\d$/.test(k))action=k;
    else if(k==="."||k===",")action=".";
    else if(k==="+"||k==="-")action=k;
    else if(k==="*")action="×";
    else if(k==="/")action="÷";
    else if(k==="%")action="%";
    else if(k==="Enter"||k==="=")action="=";
    else if(k==="Backspace")action="back";
    else if(k==="Delete"||k==="Escape")action="clear";
    if(action===null)return;
    if(k==="Enter"&&t&&t.closest&&t.closest("button")&&!t.closest("#basicKeys"))return;
    ev.preventDefault();
    try{basicPress(action)}catch(err){$("basicOutput").textContent=err.message}
    return;
  }
  if(!key)return;
  let formKey=null;
  if(/^\d$/.test(k))formKey=k;
  else if(k==="."||k===",")formKey=k;
  else if(k==="-")formKey="sign";
  else if(k==="Backspace")formKey="back";
  else if(k==="Delete")formKey="clear";
  if(formKey!==null){ev.preventDefault();formKeyPress(formKey);return;}
  if(k==="Tab"||k==="Enter"){
    if(k==="Enter"&&t&&t.closest&&t.closest("button")&&!t.closest("#formKeys"))return;
    const inputs=[...$("fields").querySelectorAll("input")];
    const idx=inputs.findIndex(x=>x.id==="f"+activeFieldId);
    const isLast=!inputs.length||idx===inputs.length-1;
    if(k==="Enter"){ev.preventDefault();if(isLast||idx<0)run();else formKeyPress("next");return;}
    if(ev.shiftKey||isLast||idx<0)return;
    ev.preventDefault();formKeyPress("next");
  }
});
