/******************************************************************************
 * jquery.i18n.properties
 *
 * Dual licensed under the GPL (http://dev.jquery.com/browser/trunk/jquery/GPL-LICENSE.txt) and
 * MIT (http://dev.jquery.com/browser/trunk/jquery/MIT-LICENSE.txt) licenses.
 *
 * @version     1.2.2
 * @url         https://github.com/jquery-i18n-properties/jquery-i18n-properties
 * @inspiration Localisation assistance for jQuery (http://keith-wood.name/localisation.html)
 *              by Keith Wood (kbwood{at}iinet.com.au) June 2007
 *
 *****************************************************************************/
!function($){function callbackIfComplete(e){e.async&&(e.filesLoaded+=1,e.filesLoaded===e.totalFiles&&e.callback&&e.callback())}function loadAndParseFile(e,a){e = a.countlyVersion ? e + "?" + a.countlyVersion : e;$.ajax({url:e,async:a.async,cache:a.cache,dataType:"text",success:function(e,r){parseData(e,a.mode),callbackIfComplete(a)},error:function(r,t,n){console.log("Failed to download or parse "+e),callbackIfComplete(a)}})}function parseData(data,mode){for(var parsed="",parameters=data.split(/\n/),regPlaceHolder=/(\{\d+})/g,regRepPlaceHolder=/\{(\d+)}/g,unicodeRE=/(\\u.{4})/gi,i=0;i<parameters.length;i++)if(parameters[i]=parameters[i].replace(/^\s\s*/,"").replace(/\s\s*$/,"").replace(/\\\\=/g, '=').replace(/\\\\:/g, ':').replace(/\\\\!/g, '!').replace(/\\=/g, '=').replace(/\\:/g, ':').replace(/\\!/g, '!'),parameters[i].length>0&&"#"!=parameters[i].match("^#")){var pair=parameters[i].split("=")
if(pair.length>0){for(var name=decodeURI(pair[0]).replace(/^\s\s*/,"").replace(/\s\s*$/,""),value=1==pair.length?"":pair[1];"\\"==value.match(/\\$/);)value=value.substring(0,value.length-1),value+=parameters[++i].replace(/\s\s*$/,"")
for(var s=2;s<pair.length;s++)value+="="+pair[s]
if(value=value.replace(/^\s\s*/,"").replace(/\s\s*$/,""),"map"==mode||"both"==mode){var unicodeMatches=value.match(unicodeRE)
if(unicodeMatches)for(var u=0;u<unicodeMatches.length;u++)value=value.replace(unicodeMatches[u],unescapeUnicode(unicodeMatches[u]))
$.i18n.map[name]=value}if("vars"==mode||"both"==mode)if(value=value.replace(/"/g,'\\"'),checkKeyNamespace(name),regPlaceHolder.test(value)){for(var parts=value.split(regPlaceHolder),first=!0,fnArgs="",usedArgs=[],p=0;p<parts.length;p++)!regPlaceHolder.test(parts[p])||0!=usedArgs.length&&-1!=usedArgs.indexOf(parts[p])||(first||(fnArgs+=","),fnArgs+=parts[p].replace(regRepPlaceHolder,"v$1"),usedArgs.push(parts[p]),first=!1)
parsed+=name+"=function("+fnArgs+"){"
var fnExpr='"'+value.replace(regRepPlaceHolder,'"+v$1+"')+'"'
parsed+="return "+fnExpr+";};"}else parsed+=name+'="'+value+'";'}}/*eval(parsed)*/}function checkKeyNamespace(key){var regDot=/\./
if(regDot.test(key))for(var fullname="",names=key.split(/\./),i=0;i<names.length;i++)i>0&&(fullname+="."),fullname+=names[i],eval("typeof "+fullname+' == "undefined"')&&eval(fullname+"={};")}function getFiles(e){return e&&e.constructor==Array?e:[e]}function unescapeUnicode(e){var a=[],r=parseInt(e.substr(2),16)
r>=0&&r<Math.pow(2,16)&&a.push(r)
for(var t="",n=0;n<a.length;++n)t+=String.fromCharCode(a[n])
return t}$.i18n={},$.i18n.map={},$.i18n.parsed={},$.i18n.properties=function(e){var a={name:"Messages",language:"",path:"",mode:"vars",cache:!1,encoding:"UTF-8",async:!1,checkAvailableLanguages:!1,callback:null}
e=$.extend(a,e),e.language=this.normaliseLanguageCode(e.language)
var r=function(a){e.totalFiles=0,e.filesLoaded=0
var r=getFiles(e.name)
if(e.async)for(var t=0,n=r.length;n>t;t++){e.totalFiles+=1
var s=e.language.substring(0,2)
if(0!=a.length&&-1==$.inArray(s,a)||(e.totalFiles+=1),e.language.length>=5){var l=e.language.substring(0,5)
0!=a.length&&-1==$.inArray(l,a)||(e.totalFiles+=1)}}for(var i=0,g=r.length;g>i;i++){loadAndParseFile(e.path+r[i]+".properties",e)
var s=e.language.substring(0,2)
if(s!=="en"){
if(0!=a.length&&-1==$.inArray(s,a)||loadAndParseFile(e.path+r[i]+"_"+s+".properties",e),e.language.length>=5){var l=e.language.substring(0,5)
0!=a.length&&-1==$.inArray(l,a)||loadAndParseFile(e.path+r[i]+"_"+l+".properties",e)}}else{callbackIfComplete(e)}}e.callback&&!e.async&&e.callback()}
e.checkAvailableLanguages?$.ajax({url:e.path+"languages.json",async:e.async,cache:!1,success:function(e,a,t){r(e.languages||[])}}):r([])},$.i18n.prop=function(e){var a=$.i18n.parsed[e]||$.i18n.map[e]
if(null==a)return"["+e+"]"
var r
2==arguments.length&&$.isArray(arguments[1])&&(r=arguments[1])
var t
if("string"==typeof a){for(t=0;-1!=(t=a.indexOf("\\",t));)a="t"==a.charAt(t+1)?a.substring(0,t)+"	"+a.substring(t++ +2):"r"==a.charAt(t+1)?a.substring(0,t)+"\r"+a.substring(t++ +2):"n"==a.charAt(t+1)?a.substring(0,t)+"\n"+a.substring(t++ +2):"f"==a.charAt(t+1)?a.substring(0,t)+"\f"+a.substring(t++ +2):"\\"==a.charAt(t+1)?a.substring(0,t)+"\\"+a.substring(t++ +2):a.substring(0,t)+a.substring(t+1)
var n,s,l=[]
for(t=0;t<a.length;)if("'"==a.charAt(t))if(t==a.length-1)a=a.substring(0,t)
else if("'"==a.charAt(t+1))a=a.substring(0,t)+a.substring(++t)
else{for(n=t+2;-1!=(n=a.indexOf("'",n));){if(n==a.length-1||"'"!=a.charAt(n+1)){a=a.substring(0,t)+a.substring(t+1,n)+a.substring(n+1),t=n-1
break}a=a.substring(0,n)+a.substring(++n)}-1==n&&(a=a.substring(0,t)+a.substring(t+1))}else if("{"==a.charAt(t))if(n=a.indexOf("}",t+1),-1==n)t++
else if(s=parseInt(a.substring(t+1,n)),!isNaN(s)&&s>=0){var i=a.substring(0,t)
""!=i&&l.push(i),l.push(s),t=0,a=a.substring(n+1)}else t=n+1
else t++
""!=a&&l.push(a),a=l,$.i18n.parsed[e]=l}if(0==a.length)return""
if(1==a.length&&"string"==typeof a[0])return a[0]
var g=""
for(t=0;t<a.length;t++)g+="string"==typeof a[t]?a[t]:r&&a[t]<r.length?r[a[t]]:!r&&a[t]+1<arguments.length?arguments[a[t]+1]:"{"+a[t]+"}"
return g},$.i18n.normaliseLanguageCode=function(e){return(!e||e.length<2)&&(e=navigator.languages?navigator.languages[0]:navigator.language||navigator.userLanguage||"en"),e=e.toLowerCase(),e=e.replace(/-/,"_"),e.length>3&&(e=e.substring(0,3)+e.substring(3).toUpperCase()),e}
var cbSplit
cbSplit||(cbSplit=function(e,a,r){if("[object RegExp]"!==Object.prototype.toString.call(a))return"undefined"==typeof cbSplit._nativeSplit?e.split(a,r):cbSplit._nativeSplit.call(e,a,r)
var t,n,s,l,i=[],g=0,c=(a.ignoreCase?"i":"")+(a.multiline?"m":"")+(a.sticky?"y":""),a=new RegExp(a.source,c+"g")
if(e+="",cbSplit._compliantExecNpcg||(t=new RegExp("^"+a.source+"$(?!\\s)",c)),void 0===r||0>+r)r=1/0
else if(r=Math.floor(+r),!r)return[]
for(;(n=a.exec(e))&&(s=n.index+n[0].length,!(s>g&&(i.push(e.slice(g,n.index)),!cbSplit._compliantExecNpcg&&n.length>1&&n[0].replace(t,function(){for(var e=1;e<arguments.length-2;e++)void 0===arguments[e]&&(n[e]=void 0)}),n.length>1&&n.index<e.length&&Array.prototype.push.apply(i,n.slice(1)),l=n[0].length,g=s,i.length>=r)));)a.lastIndex===n.index&&a.lastIndex++
return g===e.length?!l&&a.test("")||i.push(""):i.push(e.slice(g)),i.length>r?i.slice(0,r):i},cbSplit._compliantExecNpcg=void 0===/()??/.exec("")[1],cbSplit._nativeSplit=String.prototype.split),String.prototype.split=function(e,a){return cbSplit(this,e,a)}}(jQuery)