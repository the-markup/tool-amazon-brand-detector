
// chrome.runtime.onMessage.addListener(
//     function(request, sender, sendResponse) {
//       if( request.message === "clicked_browser_action" ) {
//         var firstHref = $("a[href^='http']").eq(0).attr("href");
  
//         console.log(firstHref);
  
//         // This line is new!
//         chrome.runtime.sendMessage({"message": "open_new_tab", "url": firstHref});
//       }
//     }
//   );



var now = Date.now();
chrome.runtime.sendMessage({"message": "add_stuff", "stuff": `<p>From content.js: ${now}</p>`});
chrome.runtime.sendMessage({"message": "this_url", "url": window.location.href});


chrome.runtime.onMessage.addListener(
  function(request, sender, sendResponse) {
    console.log(sender.tab ?
                "from a content script:" + sender.tab.url :
                "from the extension");
    if (request.greeting == "hello")
      sendResponse({farewell: "goodbye"});
  }
);

// var xhr = new XMLHttpRequest();
// xhr.open("GET", "https://www.amazon.com", true);
// xhr.onreadystatechange = function() {
//   if (xhr.readyState == 4) {
//     // WARNING! Might be evaluating an evil script!
//     //var resp = eval("(" + xhr.responseText + ")");
//     console.log(xhr.responseText);
//   }
// }
// xhr.send();

console.log("fully loaded content.js")