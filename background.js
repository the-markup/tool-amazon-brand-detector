
chrome.runtime.onInstalled.addListener(() => {
    console.log(`onInstalled`);
});


console.log(window.location.href);

var now = Date.now();
chrome.runtime.sendMessage({"message": "add_stuff", "stuff": `<p>From background.js: ${now}</p>`});


// Fires when icon is clicked.
chrome.browserAction.onClicked.addListener(function(tab) {
    console.log("browserAction.onClicked", tab);
    // chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    //   var activeTab = tabs[0];
    //   chrome.tabs.sendMessage(activeTab.id, {"message": "clicked_browser_action"});
    // });
});

chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {greeting: "hello"}, function(response) {
        console.log(response.farewell);
    });
});


chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("got a message", request)
    if( request.message === "this_url" ) {
        console.log("this_url", request.url);

    }
    if(request.message === 'get_products') {
        
    }
});
