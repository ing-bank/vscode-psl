function displaySettings(options){
    $("#settingsForm").css("display","flex");
    loading(options)
}

function saveOptions(server,uri){

    let promiseReq = new Promise((resolve,reject) =>{
        var xhr = new XMLHttpRequest();
   
    xhr.open("POST", server + "/settingsUpdate",false);
    xhr.setRequestHeader("Content-Type", "application/json");
    var uriString = uri.toString();
    var data = {
        uri : uriString,
        separator: document.getElementById("separator").value,
        quoteMark: document.getElementById("quoteMark").value,
        hasHeaders: document.getElementById("hasHeaders").value,
        capitalizeHeaders: document.getElementById("capitalizeHeaders").value,
        resizeColumns: document.getElementById("resizeColumns").value,
        lineNumbers: document.getElementById("lineNumbers").value,
        commentCharacter: document.getElementById("commentCharacter").value,
        skipComments: document.getElementById("skipComments").value,
        formatValues: document.getElementById("formatValues").value,
        numberFormat: document.getElementById("numberFormat").value
    }
    xhr.send(JSON.stringify(data));
    });
    promiseReq.then(loadFile(server,refreshFile));
    $("#settingsFormModal").css("display","none");
    
}



 window.onclick = function(event){
     if(event.target == document.getElementById("settingsFormModal")){
         $("#settingsFormModal").css("display","none");
     }
 }

 function closeModal(){
    $("#settingsFormModal").css("display","none");
  }

function loadOptions(server,uri){
    var xhr = new XMLHttpRequest();
    xhr.open("POST", server + "/getOptions");
    xhr.setRequestHeader("Content-Type", "application/json");
    xhr.addEventListener("load", function() {
         var opt = JSON.parse(this.response);
        loading(opt.options);
    });
    var uriP = uri.toString();
    var data ={
        uri : uriP
    }
    xhr.send(JSON.stringify(data));
}
function loading(options){
    
    $("#settingsFormModal").css("display","flex");
    $("#separator").val(encodeSeparator(options.separator));
    $("#quoteMark").val(options.quoteMark);
    $("#hasHeaders").val(options.hasHeaders.toString());
    $("#capitalizeHeaders").val(options.capitalizeHeaders.toString());
    $("#resizeColumns").val(options.resizeColumns);
    $("#lineNumbers").val(options.lineNumbers);
    $("#commentCharacter").val(options.commentCharacter);
    $("#skipComments").val(options.skipComments.toString());
    $("#formatValues").val(options.formatValues);
    $("#numberFormat").val(options.numberFormat.toString());

}

function addslashes (str) {
	 return (str + '')
			.replace(/[\\"'`]/g, '\\$&')
			.replace(/\u0000/g, '\\0')
    }

function encodeSeparator(sep){
    let decoded;
		let characters = [
			{
				regex : '\t',
				value: '\\t'
			},
			{
				regex : '/\n\r/',
				value: '\\n\\r'
			},
			{
				regex : '/\n/',
				value: '\\n'
			},
			{
				regex : '/\r/',
				value: '\\r'
			},
			{
				regex : '/\s/',
				value: '\\s'
			},
		];
		characters.forEach(function(entry){
			let regex = new RegExp(entry.regex);
			
			if(regex.test(sep)){
				decoded = entry.value;
				return ;
			}
        });
        return decoded || sep;
    }
    
function saveDocument(server,uri){
    var xhr = new XMLHttpRequest();
    xhr.open("POST", server + "/saveDocument");
    xhr.setRequestHeader("Content-Type", "application/json");
    var uriP = uri.toString();
    var data ={
        uri : uriP
    }
    xhr.send(JSON.stringify(data));

}