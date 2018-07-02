//Defining global constant variables
const toConvert = document.getElementById("toConvert");
const converted = document.getElementById("converted");
const convert = document.getElementById("convert");
const toSelect = document.getElementById("toSelect");
const fromSelect = document.getElementById("fromSelect");
const symbol = document.getElementById("symbol");
const logError = document.getElementById("logError");

//Two things should happen when a user clicks on the convert button
// 1) The conversion calculation should take place and should populate the result field.
// 2) The JSON response after the query is made should be put in the database. The response holds the 
//      query_id and the conversion_rate
convert.addEventListener("click", ()=> {
    let queryCodes = `${fromSelect.value}_${toSelect.value}`;

    function conversion(convertValue, convertRate){
        let total = convertValue * convertRate;
        converted.setAttribute("value", `${Math.round(total * 100) / 100}`);
        symbol.innerHTML = toSelect.value;
    }

    // When offline, fetch the conversion rates from database and use to calculate the conversion
    openDatabase().then( db => {
        if (!db) return;

        let tx = db.transaction('currency_rates', 'readwrite');
        let store = tx.objectStore('currency_rates'); 
        store.getAll().then( currencyRates => {
            if(currencyRates.length === 0) return;

            currencyRates.forEach( currencyRate => {
                if(currencyRate.id === queryCodes){
                    return conversion(toConvert.value, currencyRate.value);
                }
            });
        });       
    });

    fetch(`https://free.currencyconverterapi.com/api/v5/convert?q=${queryCodes}&compact=ultra`).then(responds => {
        return responds.json();
    }).then(query => {
        conversion(toConvert.value, query[queryCodes]); 

        return query;
    }).then( query => {
        openDatabase().then( db => {
            if (!db) return;

            let tx = db.transaction('currency_rates', 'readwrite');
            let store = tx.objectStore('currency_rates');
            store.put({id: queryCodes, value: query[queryCodes]});
            return store.complete;
        });
    });
});

// This event fires up when the page loads. It collects all currency from API and puts in database 
// to enable offline functionality 
self.addEventListener('load', () => {

    window.addEventListener('offline', () => {
        logError.innerHTML = `You are currently offline, go online to get the latest results`;
    });

    fromSelect.innerHTML = "" , toSelect.innerHTML = "";

    // When offline, fetch currency data from database and populate the select boxes
    openDatabase().then( db => {
        if (!db) return;

        let tx = db.transaction('country_currency', 'readwrite');
        let store = tx.objectStore('country_currency'); 
        store.getAll().then( currencyCodes => {
            if(currencyCodes.length === 0) return;

            currencyCodes.forEach( currencyCode => {
                fromSelect.innerHTML += `<option value="${currencyCode.id}">${currencyCode.id}(${currencyCode.currencyName})</option>`;
                toSelect.innerHTML += `<option value="${currencyCode.id}">${currencyCode.id}(${currencyCode.currencyName})</option>`;
            });
        });       
    });

    // If request is not found in the database, fetch from the network and save in database
    fetch(`https://free.currencyconverterapi.com/api/v5/currencies`).then(responds => {
        return responds.json();
    }).then(data => {
        let results = data.results;

        for( const currency in results ){
            fromSelect.innerHTML += `<option value="${results[currency].id}">${results[currency].id}(${results[currency].currencyName})</option>`;
            toSelect.innerHTML += `<option value="${results[currency].id}">${results[currency].id}(${results[currency].currencyName})</option>`;
        }
        return results;
    }).then( results => {
        openDatabase().then( db => {
            if (!db) return;

            let tx = db.transaction('country_currency', 'readwrite');
            let store = tx.objectStore('country_currency');
            
            for( const currency in results){
                let result = results[currency];
                store.put(result);
            }
            return store.complete;
        });
    });
});

// Opening indexedDB and creating two objectStores
self.addEventListener('load', openDatabase = () => {
    // If browser does not support service workers, no need for indexedDB
    if(!navigator.serviceWorker){
        return Promise.resolve();
    }

    return idb.open('convert', 1, (upgradeDb) => {
        upgradeDb.createObjectStore('currency_rates', {keyPath: 'id', autoIncrement: true});
        upgradeDb.createObjectStore('country_currency', {keyPath: 'id', autoIncrement: true});
    });
});
