document.body.append("test1")

chrome.runtime.sendMessage({"message": "hello from popup.js"});

chrome.runtime.onMessage.addListener( (request, sender, sendResponse) => {
    console.log("receied message:", request)
    
    if( request.message === "add_stuff" ) {
        let stuff = request.stuff;
        $(document.body).append(request.stuff)
        //document.body.append(request.stuff)
    }
});