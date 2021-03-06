
const APP = {
    DB: null,  //the indexedDB
    DBVersion: 1,
    searchStore: null,
    suggestStore: null,
    isONLINE: 'onLine' in navigator && navigator.onLine,
    tmdbBASEURL: 'https://api.themoviedb.org/3/',
    tmdbAPIKEY: '99bfb48bf74bed439d4a45a53a55f249',
    tmdbIMAGEBASEURL: 'https://image.tmdb.org/t/p/w500',
    results: [],
    input: null,
    movieId: null,
    movieTitle: null,
    init: ()=>{
        console.log('init called')
        APP.openDatabase(APP.registerSW); //register the service worker after the DB is open
        
    },
    
    openDatabase: (nextStep)=>{
        console.log('openDB called')
        //open the database
        let dbOpenRequest = indexedDB.open('movieDB', APP.DBVersion);

        //add the update, error, success listeners in here
        dbOpenRequest.onupgradeneeded = function (ev) {
            APP.DB = ev.target.result;

            try {
            APP.DB.deleteObjectStore('searchStore');
            APP.DB.deleteObjectStore('suggestStore');
            } catch (err) {
                console.log('err deleting older db')
            }

            //create searchStore with keyword as keyPath
            APP.searchStore = APP.DB.createObjectStore("searchStore", {keyPath: "keyword", autoIncrement: false,});

            //create suggestStore with movieid as keyPath
            APP.suggestStore = APP.DB.createObjectStore("suggestStore", {keyPath: "movieid", autoIncrement: false,});
        }
        
        dbOpenRequest.onerror = function (err) {
         //an error has happened during opening
        };

        dbOpenRequest.onsuccess = function (ev) {
            APP.DB = dbOpenRequest.result;

            console.log(APP.DB.name, `is ready to be used.`); 
            //call nextStep onsuccess
            nextStep()
        };
    },

    registerSW: ()=>{
        console.log('registerSW called')
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('/sw.js').catch(function (err) {
              // Something went wrong during registration. The sw.js file
              // might be unavailable or contain a syntax error.
                console.warn(err);
            });
            navigator.serviceWorker.ready.then((registration) => {
                
            });
        }

        APP.pageSpecific();
        APP.addListeners();
    },

    addListeners: (ev)=>{
        console.log('add listeners called')
        let searchForm = document.querySelectorAll('#searchForm')
        searchForm.forEach((form) => {
            form.addEventListener('submit', APP.searchFormSubmitted)
        })

        if(document.body.id === 'results' || document.body.id === 'suggest'){
            let cards = document.querySelectorAll('.results__card')
            cards.forEach((card) => {
                card.addEventListener('click', APP.cardListClicked)
            })
        }
    
        //add event listeners for online and offline
        window.addEventListener('online', APP.changeOnlineStatus);
        window.addEventListener('offline', APP.changeOnlineStatus); 
    
    },

    pageSpecific:()=>{
        console.log('pagespecific called')
        
        APP.input = window.location.href.split("=")[1]

        if(document.body.id === 'home'){
            APP.getPastSearches()
        }

        if(document.body.id === 'results'){
            APP.getSearchResults( 'searchStore', APP.input)
        }

        if(document.body.id === 'suggest'){
            let movieId =  location.href.split("=")[1]
            APP.getSuggestedResults('suggestStore', movieId)
        }

        if(document.body.id === 'error'){
            APP.getPastSearches()
        } 
    },
    
    createTransaction: (storeName)=>{
        console.log('createTX called')
        let tx = APP.DB.transaction(storeName, 'readwrite');
        return tx;
    },

    getDBResults: (storeName) => {
        console.log('getBDresults called')
        
        let store = APP.createTransaction(storeName).objectStore(storeName)

        let getRequest
            if (storeName==='searchStore') {
                getRequest = store.get(APP.input);
            }

            if (storeName==='suggestStore') {
                getRequest = store.get(APP.movieId);
            }
                
            getRequest.onerror = (err) => {
                
            };

            getRequest.onsuccess = (ev) => {
                
                console.log('DATA TAKEN FROM DB _ getDBResults TEST')
                let obj = getRequest.result;
            
                APP.displayCards(obj)
            };
    }, 
        

    addResultsToDB: (obj, storeName)=>{
        console.log('addResToDB called')
        //creating a tx
        let store = APP.createTransaction(storeName).objectStore(storeName)

        //creating objects
        let newObj
        if(storeName === 'searchStore') {
            newObj = {
                keyword: APP.input,
                results: obj,
            };
        }

        if(storeName === 'suggestStore') {
            newObj = {
                movieid: APP.movieId,
                results: obj,
            };
        }
        //adding data to DB
        let addReq = store.add(newObj);
        
        addReq.onerror = (err) => {
            console.log(err)
        };
        addReq.onsuccess = (ev) => {
            console.log('DATA ADDED TO DB')
            APP.getDBResults(storeName)
        };
    },

    getPastSearches:() => {
        let store = APP.createTransaction('searchStore').objectStore('searchStore') 

        let getRequest = store.getAll()

        getRequest.onerror = (err) => {
                
        };

        getRequest.onsuccess = (ev) => {
                
            console.log('GOT RESULTS FROM DB')
            let objects = getRequest.result;

            APP.buildPastSearches(objects)
        };
    },

    buildPastSearches:(objects) => {
        let pastSearch = document.getElementById('pastSearches')
        let df = document.createDocumentFragment()

        objects.forEach((object) => {
            let keyword = object.keyword.replace(/[\s.;,&?%0-9]/g, ' ')
            let p = document.createElement('p')
            p.setAttribute('data-id', keyword)
            p.setAttribute('tabindex', '0')
            p.classList.add('searchword')
            p.textContent = keyword
            df.append(p)
        })

        pastSearch.append(df)

        let keywords = document.querySelectorAll('#pastSearches > p')
        keywords.forEach((keyword) => {
            keyword.addEventListener('click', APP.pastSearchClicked)
        })
    },

    pastSearchClicked: (ev) => {
        let keyword = ev.target.closest('p').getAttribute('data-id')
        let url = `/results.html?keyword=${keyword}`
        APP.navigate(url)
    },

    changeOnlineStatus: (ev)=>{
        //when the browser goes online or offline
        APP.isONLINE = ev.type === 'online' ? true : false;
        //TODO: send message to sw about being online or offline
        navigator.serviceWorker.ready.then((registration) => {
        registration.active.postMessage({ ONLINE: APP.isONLINE});
        });

        APP.changeDisplay()
    },

    changeDisplay: () => {
        console.log('changeDisplay called')
        let offlineMessage = document.getElementById('offline')
        if (APP.isONLINE) {
            //online
            offlineMessage.classList.add('display-none')
        } else {
            //offline
            offlineMessage.classList.remove('display-none')
        }
    },

    searchFormSubmitted: (ev)=>{
        console.log('searchFormSubmitted called')
        ev.preventDefault();
        
        APP.input = document.getElementById('search').value;
        if (APP.input) {
            console.log('FORM SUBMITTED')
            let url = `/results.html?keyword=${APP.input}`
            
            APP.navigate(url)
        } else {
            alert("Please, enter a keyword to start a search")
        }
    },

    cardListClicked: (ev)=>{
        console.log('cardClicked called')

        let movieId = ev.target.closest('.results__card').getAttribute('data-id');
        let movieTitle = ev.target.closest('.results__card').getAttribute('data-title')

        let url = `/suggested.html?movieid=${movieId}=movietitle=${movieTitle}`
        APP.navigate(url, movieTitle)
    },

    getData: (storeName)=>{
        console.log('getData called')
        //do a fetch call to the endpoint
        let url
        
        if (storeName === 'searchStore') {
            url = `${APP.tmdbBASEURL}search/movie?api_key=${APP.tmdbAPIKEY}&query=${APP.input}&language=en-US`
        }

        if (storeName === 'suggestStore') {
            let movieId = location.href.split("=")[1]
            APP.movieId = movieId

            url = `${APP.tmdbBASEURL}movie/${movieId}/recommendations?api_key=${APP.tmdbAPIKEY}&language=en-US&page=1`
        }

        console.log('Fetching...')
        fetch(url)
            .then(resp=>{
                if(resp.status >= 400){
                    throw new NetworkError(`Failed fetch to ${url}`, resp.status, resp.statusText);
                }
                return resp.json();
            })

            .then(contents=>{
                console.log('FETCH SUCCESSFUL')
                let results = contents.results;
                //remove the properties we don't need
                let newResults = results.map(({adult, backdrop_path, genre_ids, original_title, video, vote_count,...rest}) => rest)              

                //save the updated results to APP.results
                APP.results = newResults
                    
                // call the callback
                APP.addResultsToDB(APP.results, storeName )
            })
            .catch(err=>{
                //handle the NetworkError
            })
    },
    
    getSearchResults:(storeName)=>{
        console.log('getSearchResults called')

        let searchStore = APP.createTransaction(storeName).objectStore(storeName)
        let req = searchStore.openCursor(APP.input);

            req.onsuccess = function (ev) {
                let cursor = ev.target.result; 
                console.log({cursor})
                //check in DB for match of keyword in searchStore
                //if no match in DB do a fetch
                if (cursor) { // key already exist
                    APP.getDBResults(storeName, APP.input)
                    // 
                } else { // key not exist
                    console.log('DATA IS NOT IN DB')
                    if (!APP.isONLINE) {
                        console.log('APP OFFLINE')
                    } else {
                        console.log('APP ONLINE')
                        APP.getData(storeName)
                    }
                }
            }
    },

    getSuggestedResults:(storeName)=>{
        console.log('getSuggestResults called')

        let suggestStore = APP.createTransaction(storeName).objectStore(storeName)
        let movieId = location.href.split("=")[1]
        APP.movieId = movieId
        let req = suggestStore.openCursor(APP.movieId);
        
            req.onsuccess = function (ev) {
                let cursor = ev.target.result; 
                if (cursor) { // key already exist
                    console.log('data exists in Suggest store')
                    APP.getDBResults(storeName)
                    // 
                } else { // key not exist
                    console.log('DATA IS NOT IN DB')
                    if (!APP.isONLINE) {
                        console.log('APP OFFLINE')
                    } else {
                        console.log('APP ONLINE')
                        APP.getData(storeName)
                    }
                }
            }
    },

    displayCards: (results)=>{
        console.log('displayCards called')

        //turning an object into something usable
        let obj = JSON.stringify(results)
        let DBEntry= JSON.parse(obj)
        let moviesArr = DBEntry.results

        //getting a movie title from URL
        let movieTitle = location.href.split("=")[1]
        let clickedMovieTitle =  location.href.split("=")[3]

        let noMovies = document.getElementById('noMovies')
        let resArea = document.getElementById('resultsArea')
        
        //if results array is empty
        if (moviesArr.length == 0) {
            console.log('there are no movies')

            resArea.classList.add('display-none')
            noMovies.classList.remove('display-none')
            let wrongWord = document.createElement('span')
            wrongWord.style.color = '#6e57e0'
            let h2 = document.querySelector("#noMovies > h2")
            if (document.body.id === 'results'){
                wrongWord.textContent = ` "${movieTitle.replace(/[\s.;,&?%0-9]/g, ' ')}".`
            }
            if ((document.body.id === 'suggest')) {
                wrongWord.textContent = ` "${clickedMovieTitle.replace(/[\s.;,&?%0-9]/g, ' ')}".`
            }

            h2.append(wrongWord)
        } else {
            //if results array is not empty
            console.log(moviesArr)
            resArea.classList.remove('display-none')
            noMovies.classList.add('display-none')

            //BUILDING CARDS
            // specific for results page
            if (document.body.id === 'results'){
                console.log('BUILDING CARD FOR RESULTS')
                let resultsPageTitle = document.getElementById('resultsPageTitle')
                let span = document.createElement('span')
                span.style.color = '#6e57e0'
                span.textContent = `"${movieTitle.replace(/[\s.;,&?%0-9]/g, ' ')}"`

                resultsPageTitle.textContent = `Wow! Here's what I found for `
                resultsPageTitle.append(span)

            } if ((document.body.id === 'suggest')) {            // specific for suggested page
                let span = document.getElementById('movieName')
                span.style.color = '#6e57e0'
                span.textContent = `"${clickedMovieTitle.replace(/[\s.;,&?%0-9]/g, ' ')}"`
            }

            let resultsContent = document.querySelector('#resultsContent')
            let df = document.createDocumentFragment()

            moviesArr.forEach((movie) => {
                let resultsCard = document.createElement('div')
                resultsCard.setAttribute('data-id', movie.id)
                resultsCard.setAttribute('data-title', movie.title)
                resultsCard.classList.add('results__card')
                    let movieInfo = document.createElement('div')
                    movieInfo.setAttribute('id', 'movieInfo')
                    movieInfo.classList.add('movie__info')
                        let img = document.createElement('img')
                        let imgSrc 
                        if (movie.poster_path) {
                            imgSrc = `${APP.tmdbIMAGEBASEURL}${movie.poster_path}`
                        } else {
                            imgSrc = './img/placeholder-img.png'
                        }
                            img.src = imgSrc
        
                            img.setAttribute('alt', `Cover of "${movie.title}"` )
                            let movieInfoText = document.createElement('div')
                            movieInfoText.setAttribute('id', 'movieInfoText')
                            movieInfoText.classList.add('movie__info-text')
                                let h3 = document.createElement('h3')
                                h3.textContent = `${movie.title}`
                                let pYear = document.createElement('p')
                                if(movie.release_date) {
                                    pYear.textContent =`Release year: ${movie.release_date.slice(0,4)}`
                                }
                                let pLang = document.createElement('p')
                                pLang.textContent = `Language: ${movie.original_language.toUpperCase()}`
                                let rating = document.createElement('p')
                                rating.textContent = `Rating: ${movie.vote_average}`
                        let movieDescription = document.createElement('p')
                        movieDescription.textContent = movie.overview
                        movieDescription.classList.add('movie__description')
                        
                        movieInfoText.append(h3, pYear, pLang, rating)
                    movieInfo.append(img, movieInfoText)
                resultsCard.append(movieInfo, movieDescription)
            df.append(resultsCard)
            })

            //append cards to their container
            resultsContent.append(df)

            //add listeners to cards
            APP.addListeners()
        } 
    },

    navigate: (url)=>{
        console.log('navigate called')
        //change the current page
        window.location = url
    }
}

document.addEventListener('DOMContentLoaded', APP.init);
