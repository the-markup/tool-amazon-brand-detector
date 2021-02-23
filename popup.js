console.log("popup.js", window.location.href);

var now = Date.now();
document.body.append(`<p>${now}</p>`)

chrome.runtime.sendMessage({"type": "popup"}, response => {
    console.log(response);
});


/*
setInterval(() => {
    var now = Date.now();
    chrome.runtime.sendMessage({"type": "heartbeat", "message": `popup.js: ${now}`});

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        var activeTab = tabs[0];
        chrome.tabs.sendMessage(activeTab.id, {"type": "heartbeat", "message": `popup.js to active tab: ${now}`});
    });
}, 1000);


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log(request);
});



chrome.runtime.sendMessage({"message": "hello from popup.js"});

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    console.log("receied message:", request)
    
    if( request.message === "add_stuff" ) {
        let stuff = request.stuff;
        $(document.body).append(request.stuff)
        //document.body.append(request.stuff)
    }
});
*/