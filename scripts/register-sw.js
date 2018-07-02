self.addEventListener("load", () => {
    // if the browser doesn't surpport service workers then do not do anything 
    if(!navigator.serviceWorker) return;

    // When the user asks to refresh the UI, we'll need to reload the window
    navigator.serviceWorker.addEventListener('message', (event) => {
        if (!event.data) {
        return;
        }
        
        switch (event.data) {
        case 'reload-window':
            window.location.reload();
            break;
        default:
            // NOOP
            break;
        }
    });

    function updateReady(worker){
        worker.postMessage({action: 'skipWaiting'});
    }
    function trackInstalling(worker){
        worker.addEventListener('statechange', () => {
            if(worker.state == 'installed'){
                updateReady(worker);
            }
        });
    }

    // registering the service worker
    navigator.serviceWorker.register('sw.js').then(reg => {

        if (!navigator.serviceWorker.controller) {
            return;
        }

        console.log(`registration complete : ${reg.scope}`);

        if (reg.waiting) {
            console.log("waiting...");
            updateReady(reg.waiting);
            return;
        }
      
        if (reg.installing) {
            console.log("installing...");
            trackInstalling(reg.installing);
            return;
        }
    
        reg.addEventListener('updatefound', () => {
            trackInstalling(reg.installing);
            alert("New version available. Click OK to get it");
        });

    }).catch(() => {
        console.log("registration broken");
    });

    // Ensure refresh is only called once.
    let refreshing;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
        if (refreshing) return;
        window.location.reload();
        refreshing = true;
    });
})
