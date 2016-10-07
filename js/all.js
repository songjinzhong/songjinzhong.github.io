/**
 * impress.js
 *
 * impress.js is a presentation tool based on the power of CSS3 transforms and transitions
 * in modern browsers and inspired by the idea behind prezi.com.
 *
 *
 * Copyright 2011-2012 Bartek Szopka (@bartaz)
 *
 * Released under the MIT and GPL Licenses.
 *
 * ------------------------------------------------
 *  author:  Bartek Szopka
 *  version: 0.5.3
 *  url:     http://bartaz.github.com/impress.js/
 *  source:  http://github.com/bartaz/impress.js/
 */

/*jshint bitwise:true, curly:true, eqeqeq:true, forin:true, latedef:true, newcap:true,
         noarg:true, noempty:true, undef:true, strict:true, browser:true */

// You are one of those who like to know how things work inside?
// Let me show you the cogs that make impress.js run...
( function( document, window ) {
    "use strict";

    // HELPER FUNCTIONS

    // `pfx` is a function that takes a standard CSS property name as a parameter
    // and returns it's prefixed version valid for current browser it runs in.
    // The code is heavily inspired by Modernizr http://www.modernizr.com/
    var pfx = ( function() {

        var style = document.createElement( "dummy" ).style,
            prefixes = "Webkit Moz O ms Khtml".split( " " ),
            memory = {};

        return function( prop ) {
            if ( typeof memory[ prop ] === "undefined" ) {

                var ucProp  = prop.charAt( 0 ).toUpperCase() + prop.substr( 1 ),
                    props   = ( prop + " " + prefixes.join( ucProp + " " ) + ucProp ).split( " " );

                memory[ prop ] = null;
                for ( var i in props ) {
                    if ( style[ props[ i ] ] !== undefined ) {
                        memory[ prop ] = props[ i ];
                        break;
                    }
                }

            }

            return memory[ prop ];
        };

    } )();

    // `arraify` takes an array-like object and turns it into real Array
    // to make all the Array.prototype goodness available.
    var arrayify = function( a ) {
        return [].slice.call( a );
    };

    // `css` function applies the styles given in `props` object to the element
    // given as `el`. It runs all property names through `pfx` function to make
    // sure proper prefixed version of the property is used.
    var css = function( el, props ) {
        var key, pkey;
        for ( key in props ) {
            if ( props.hasOwnProperty( key ) ) {
                pkey = pfx( key );
                if ( pkey !== null ) {
                    el.style[ pkey ] = props[ key ];
                }
            }
        }
        return el;
    };

    // `toNumber` takes a value given as `numeric` parameter and tries to turn
    // it into a number. If it is not possible it returns 0 (or other value
    // given as `fallback`).
    var toNumber = function( numeric, fallback ) {
        return isNaN( numeric ) ? ( fallback || 0 ) : Number( numeric );
    };

    // `byId` returns element with given `id` - you probably have guessed that ;)
    var byId = function( id ) {
        return document.getElementById( id );
    };

    // `$` returns first element for given CSS `selector` in the `context` of
    // the given element or whole document.
    var $ = function( selector, context ) {
        context = context || document;
        return context.querySelector( selector );
    };

    // `$$` return an array of elements for given CSS `selector` in the `context` of
    // the given element or whole document.
    var $$ = function( selector, context ) {
        context = context || document;
        return arrayify( context.querySelectorAll( selector ) );
    };

    // `triggerEvent` builds a custom DOM event with given `eventName` and `detail` data
    // and triggers it on element given as `el`.
    var triggerEvent = function( el, eventName, detail ) {
        var event = document.createEvent( "CustomEvent" );
        event.initCustomEvent( eventName, true, true, detail );
        el.dispatchEvent( event );
    };

    // `translate` builds a translate transform string for given data.
    var translate = function( t ) {
        return " translate3d(" + t.x + "px," + t.y + "px," + t.z + "px) ";
    };

    // `rotate` builds a rotate transform string for given data.
    // By default the rotations are in X Y Z order that can be reverted by passing `true`
    // as second parameter.
    var rotate = function( r, revert ) {
        var rX = " rotateX(" + r.x + "deg) ",
            rY = " rotateY(" + r.y + "deg) ",
            rZ = " rotateZ(" + r.z + "deg) ";

        return revert ? rZ + rY + rX : rX + rY + rZ;
    };

    // `scale` builds a scale transform string for given data.
    var scale = function( s ) {
        return " scale(" + s + ") ";
    };

    // `perspective` builds a perspective transform string for given data.
    var perspective = function( p ) {
        return " perspective(" + p + "px) ";
    };

    // `getElementFromHash` returns an element located by id from hash part of
    // window location.
    var getElementFromHash = function() {

        // Get id from url # by removing `#` or `#/` from the beginning,
        // so both "fallback" `#slide-id` and "enhanced" `#/slide-id` will work
        return byId( window.location.hash.replace( /^#\/?/, "" ) );
    };

    // `computeWindowScale` counts the scale factor between window size and size
    // defined for the presentation in the config.
    var computeWindowScale = function( config ) {
        var hScale = window.innerHeight / config.height,
            wScale = window.innerWidth / config.width,
            scale = hScale > wScale ? wScale : hScale;

        if ( config.maxScale && scale > config.maxScale ) {
            scale = config.maxScale;
        }

        if ( config.minScale && scale < config.minScale ) {
            scale = config.minScale;
        }

        return scale;
    };

    // CHECK SUPPORT
    var body = document.body;

    var ua = navigator.userAgent.toLowerCase();
    var impressSupported =

                          // Browser should support CSS 3D transtorms
                           ( pfx( "perspective" ) !== null ) &&

                          // Browser should support `classList` and `dataset` APIs
                           ( body.classList ) &&
                           ( body.dataset ) &&

                          // But some mobile devices need to be blacklisted,
                          // because their CSS 3D support or hardware is not
                          // good enough to run impress.js properly, sorry...
                           ( ua.search( /(iphone)|(ipod)|(android)/ ) === -1 );

    if ( !impressSupported ) {

        // We can't be sure that `classList` is supported
        body.className += " impress-not-supported ";
    } else {
        body.classList.remove( "impress-not-supported" );
        body.classList.add( "impress-supported" );
    }

    // GLOBALS AND DEFAULTS

    // This is where the root elements of all impress.js instances will be kept.
    // Yes, this means you can have more than one instance on a page, but I'm not
    // sure if it makes any sense in practice ;)
    var roots = {};

    // Some default config values.
    var defaults = {
        width: 1024,
        height: 768,
        maxScale: 1,
        minScale: 0,

        perspective: 1000,

        transitionDuration: 1000
    };

    // It's just an empty function ... and a useless comment.
    var empty = function() { return false; };

    // IMPRESS.JS API

    // And that's where interesting things will start to happen.
    // It's the core `impress` function that returns the impress.js API
    // for a presentation based on the element with given id ('impress'
    // by default).
    var impress = window.impress = function( rootId ) {

        // If impress.js is not supported by the browser return a dummy API
        // it may not be a perfect solution but we return early and avoid
        // running code that may use features not implemented in the browser.
        if ( !impressSupported ) {
            return {
                init: empty,
                goto: empty,
                prev: empty,
                next: empty
            };
        }

        rootId = rootId || "impress";

        // If given root is already initialized just return the API
        if ( roots[ "impress-root-" + rootId ] ) {
            return roots[ "impress-root-" + rootId ];
        }

        // Data of all presentation steps
        var stepsData = {};

        // Element of currently active step
        var activeStep = null;

        // Current state (position, rotation and scale) of the presentation
        var currentState = null;

        // Array of step elements
        var steps = null;

        // Configuration options
        var config = null;

        // Scale factor of the browser window
        var windowScale = null;

        // Root presentation elements
        var root = byId( rootId );
        var canvas = document.createElement( "div" );

        var initialized = false;

        // STEP EVENTS
        //
        // There are currently two step events triggered by impress.js
        // `impress:stepenter` is triggered when the step is shown on the
        // screen (the transition from the previous one is finished) and
        // `impress:stepleave` is triggered when the step is left (the
        // transition to next step just starts).

        // Reference to last entered step
        var lastEntered = null;

        // `onStepEnter` is called whenever the step element is entered
        // but the event is triggered only if the step is different than
        // last entered step.
        var onStepEnter = function( step ) {
            if ( lastEntered !== step ) {
                triggerEvent( step, "impress:stepenter" );
                lastEntered = step;
            }
        };

        // `onStepLeave` is called whenever the step element is left
        // but the event is triggered only if the step is the same as
        // last entered step.
        var onStepLeave = function( step ) {
            if ( lastEntered === step ) {
                triggerEvent( step, "impress:stepleave" );
                lastEntered = null;
            }
        };

        // `initStep` initializes given step element by reading data from its
        // data attributes and setting correct styles.
        var initStep = function( el, idx ) {
            var data = el.dataset,
                step = {
                    translate: {
                        x: toNumber( data.x ),
                        y: toNumber( data.y ),
                        z: toNumber( data.z )
                    },
                    rotate: {
                        x: toNumber( data.rotateX ),
                        y: toNumber( data.rotateY ),
                        z: toNumber( data.rotateZ || data.rotate )
                    },
                    scale: toNumber( data.scale, 1 ),
                    el: el
                };

            if ( !el.id ) {
                el.id = "step-" + ( idx + 1 );
            }

            stepsData[ "impress-" + el.id ] = step;

            css( el, {
                position: "absolute",
                transform: "translate(-50%,-50%)" +
                           translate( step.translate ) +
                           rotate( step.rotate ) +
                           scale( step.scale ),
                transformStyle: "preserve-3d"
            } );
        };

        // `init` API function that initializes (and runs) the presentation.
        var init = function() {
            if ( initialized ) { return; }

            // First we set up the viewport for mobile devices.
            // For some reason iPad goes nuts when it is not done properly.
            var meta = $( "meta[name='viewport']" ) || document.createElement( "meta" );
            meta.content = "width=device-width, minimum-scale=1, maximum-scale=1, user-scalable=no";
            if ( meta.parentNode !== document.head ) {
                meta.name = "viewport";
                document.head.appendChild( meta );
            }

            // Initialize configuration object
            var rootData = root.dataset;
            config = {
                width: toNumber( rootData.width, defaults.width ),
                height: toNumber( rootData.height, defaults.height ),
                maxScale: toNumber( rootData.maxScale, defaults.maxScale ),
                minScale: toNumber( rootData.minScale, defaults.minScale ),
                perspective: toNumber( rootData.perspective, defaults.perspective ),
                transitionDuration: toNumber(
                  rootData.transitionDuration, defaults.transitionDuration
                )
            };

            windowScale = computeWindowScale( config );

            // Wrap steps with "canvas" element
            arrayify( root.childNodes ).forEach( function( el ) {
                canvas.appendChild( el );
            } );
            root.appendChild( canvas );

            // Set initial styles
            document.documentElement.style.height = "100%";

            css( body, {
                height: "100%",
                overflow: "hidden"
            } );

            var rootStyles = {
                position: "absolute",
                transformOrigin: "top left",
                transition: "all 0s ease-in-out",
                transformStyle: "preserve-3d"
            };

            css( root, rootStyles );
            css( root, {
                top: "50%",
                left: "50%",
                transform: perspective( config.perspective / windowScale ) + scale( windowScale )
            } );
            css( canvas, rootStyles );

            body.classList.remove( "impress-disabled" );
            body.classList.add( "impress-enabled" );

            // Get and init steps
            steps = $$( ".step", root );
            steps.forEach( initStep );

            // Set a default initial state of the canvas
            currentState = {
                translate: { x: 0, y: 0, z: 0 },
                rotate:    { x: 0, y: 0, z: 0 },
                scale:     1
            };

            initialized = true;

            triggerEvent( root, "impress:init", { api: roots[ "impress-root-" + rootId ] } );
        };

        // `getStep` is a helper function that returns a step element defined by parameter.
        // If a number is given, step with index given by the number is returned, if a string
        // is given step element with such id is returned, if DOM element is given it is returned
        // if it is a correct step element.
        var getStep = function( step ) {
            if ( typeof step === "number" ) {
                step = step < 0 ? steps[ steps.length + step ] : steps[ step ];
            } else if ( typeof step === "string" ) {
                step = byId( step );
            }
            return ( step && step.id && stepsData[ "impress-" + step.id ] ) ? step : null;
        };

        // Used to reset timeout for `impress:stepenter` event
        var stepEnterTimeout = null;

        // `goto` API function that moves to step given with `el` parameter
        // (by index, id or element), with a transition `duration` optionally
        // given as second parameter.
        var goto = function( el, duration ) {

            if ( !initialized || !( el = getStep( el ) ) ) {

                // Presentation not initialized or given element is not a step
                return false;
            }

            // Sometimes it's possible to trigger focus on first link with some keyboard action.
            // Browser in such a case tries to scroll the page to make this element visible
            // (even that body overflow is set to hidden) and it breaks our careful positioning.
            //
            // So, as a lousy (and lazy) workaround we will make the page scroll back to the top
            // whenever slide is selected
            //
            // If you are reading this and know any better way to handle it, I'll be glad to hear
            // about it!
            window.scrollTo( 0, 0 );

            var step = stepsData[ "impress-" + el.id ];

            if ( activeStep ) {
                activeStep.classList.remove( "active" );
                body.classList.remove( "impress-on-" + activeStep.id );
            }
            el.classList.add( "active" );

            body.classList.add( "impress-on-" + el.id );

            // Compute target state of the canvas based on given step
            var target = {
                rotate: {
                    x: -step.rotate.x,
                    y: -step.rotate.y,
                    z: -step.rotate.z
                },
                translate: {
                    x: -step.translate.x,
                    y: -step.translate.y,
                    z: -step.translate.z
                },
                scale: 1 / step.scale
            };

            // Check if the transition is zooming in or not.
            //
            // This information is used to alter the transition style:
            // when we are zooming in - we start with move and rotate transition
            // and the scaling is delayed, but when we are zooming out we start
            // with scaling down and move and rotation are delayed.
            var zoomin = target.scale >= currentState.scale;

            duration = toNumber( duration, config.transitionDuration );
            var delay = ( duration / 2 );

            // If the same step is re-selected, force computing window scaling,
            // because it is likely to be caused by window resize
            if ( el === activeStep ) {
                windowScale = computeWindowScale( config );
            }

            var targetScale = target.scale * windowScale;

            // Trigger leave of currently active element (if it's not the same step again)
            if ( activeStep && activeStep !== el ) {
                onStepLeave( activeStep );
            }

            // Now we alter transforms of `root` and `canvas` to trigger transitions.
            //
            // And here is why there are two elements: `root` and `canvas` - they are
            // being animated separately:
            // `root` is used for scaling and `canvas` for translate and rotations.
            // Transitions on them are triggered with different delays (to make
            // visually nice and 'natural' looking transitions), so we need to know
            // that both of them are finished.
            css( root, {

                // To keep the perspective look similar for different scales
                // we need to 'scale' the perspective, too
                transform: perspective( config.perspective / targetScale ) + scale( targetScale ),
                transitionDuration: duration + "ms",
                transitionDelay: ( zoomin ? delay : 0 ) + "ms"
            } );

            css( canvas, {
                transform: rotate( target.rotate, true ) + translate( target.translate ),
                transitionDuration: duration + "ms",
                transitionDelay: ( zoomin ? 0 : delay ) + "ms"
            } );

            // Here is a tricky part...
            //
            // If there is no change in scale or no change in rotation and translation, it means
            // there was actually no delay - because there was no transition on `root` or `canvas`
            // elements. We want to trigger `impress:stepenter` event in the correct moment, so
            // here we compare the current and target values to check if delay should be taken into
            // account.
            //
            // I know that this `if` statement looks scary, but it's pretty simple when you know
            // what is going on
            // - it's simply comparing all the values.
            if ( currentState.scale === target.scale ||
                ( currentState.rotate.x === target.rotate.x &&
                  currentState.rotate.y === target.rotate.y &&
                  currentState.rotate.z === target.rotate.z &&
                  currentState.translate.x === target.translate.x &&
                  currentState.translate.y === target.translate.y &&
                  currentState.translate.z === target.translate.z ) ) {
                delay = 0;
            }

            // Store current state
            currentState = target;
            activeStep = el;

            // And here is where we trigger `impress:stepenter` event.
            // We simply set up a timeout to fire it taking transition duration
            // (and possible delay) into account.
            //
            // I really wanted to make it in more elegant way. The `transitionend` event seemed to
            // be the best way to do it, but the fact that I'm using transitions on two separate
            // elements and that the `transitionend` event is only triggered when there was a
            // transition (change in the values) caused some bugs and made the code really
            // complicated, cause I had to handle all the conditions separately. And it still
            // needed a `setTimeout` fallback for the situations when there is no transition at
            // all.
            // So I decided that I'd rather make the code simpler than use shiny new
            // `transitionend`.
            //
            // If you want learn something interesting and see how it was done with `transitionend`
            // go back to
            // version 0.5.2 of impress.js:
            // http://github.com/bartaz/impress.js/blob/0.5.2/js/impress.js
            window.clearTimeout( stepEnterTimeout );
            stepEnterTimeout = window.setTimeout( function() {
                onStepEnter( activeStep );
            }, duration + delay );

            return el;
        };

        // `prev` API function goes to previous step (in document order)
        var prev = function() {
            var prev = steps.indexOf( activeStep ) - 1;
            prev = prev >= 0 ? steps[ prev ] : steps[ steps.length - 1 ];

            return goto( prev );
        };

        // `next` API function goes to next step (in document order)
        var next = function() {
            var next = steps.indexOf( activeStep ) + 1;
            next = next < steps.length ? steps[ next ] : steps[ 0 ];

            return goto( next );
        };

        // Adding some useful classes to step elements.
        //
        // All the steps that have not been shown yet are given `future` class.
        // When the step is entered the `future` class is removed and the `present`
        // class is given. When the step is left `present` class is replaced with
        // `past` class.
        //
        // So every step element is always in one of three possible states:
        // `future`, `present` and `past`.
        //
        // There classes can be used in CSS to style different types of steps.
        // For example the `present` class can be used to trigger some custom
        // animations when step is shown.
        root.addEventListener( "impress:init", function() {

            // STEP CLASSES
            steps.forEach( function( step ) {
                step.classList.add( "future" );
            } );

            root.addEventListener( "impress:stepenter", function( event ) {
                event.target.classList.remove( "past" );
                event.target.classList.remove( "future" );
                event.target.classList.add( "present" );
            }, false );

            root.addEventListener( "impress:stepleave", function( event ) {
                event.target.classList.remove( "present" );
                event.target.classList.add( "past" );
            }, false );

        }, false );

        // Adding hash change support.
        root.addEventListener( "impress:init", function() {

            // Last hash detected
            var lastHash = "";

            // `#/step-id` is used instead of `#step-id` to prevent default browser
            // scrolling to element in hash.
            //
            // And it has to be set after animation finishes, because in Chrome it
            // makes transtion laggy.
            // BUG: http://code.google.com/p/chromium/issues/detail?id=62820
            root.addEventListener( "impress:stepenter", function( event ) {
                window.location.hash = lastHash = "#/" + event.target.id;
            }, false );

            window.addEventListener( "hashchange", function() {

                // When the step is entered hash in the location is updated
                // (just few lines above from here), so the hash change is
                // triggered and we would call `goto` again on the same element.
                //
                // To avoid this we store last entered hash and compare.
                if ( window.location.hash !== lastHash ) {
                    goto( getElementFromHash() );
                }
            }, false );

            // START
            // by selecting step defined in url or first step of the presentation
            goto( getElementFromHash() || steps[ 0 ], 0 );
        }, false );

        body.classList.add( "impress-disabled" );

        // Store and return API for given impress.js root element
        return ( roots[ "impress-root-" + rootId ] = {
            init: init,
            goto: goto,
            next: next,
            prev: prev
        } );

    };

    // Flag that can be used in JS to check if browser have passed the support test
    impress.supported = impressSupported;

} )( document, window );

// NAVIGATION EVENTS

// As you can see this part is separate from the impress.js core code.
// It's because these navigation actions only need what impress.js provides with
// its simple API.
//
// In future I think about moving it to make them optional, move to separate files
// and treat more like a 'plugins'.
( function( document, window ) {
    "use strict";

    // Throttling function calls, by Remy Sharp
    // http://remysharp.com/2010/07/21/throttling-function-calls/
    var throttle = function( fn, delay ) {
        var timer = null;
        return function() {
            var context = this, args = arguments;
            clearTimeout( timer );
            timer = setTimeout( function() {
                fn.apply( context, args );
            }, delay );
        };
    };

    // Wait for impress.js to be initialized
    document.addEventListener( "impress:init", function( event ) {

        // Getting API from event data.
        // So you don't event need to know what is the id of the root element
        // or anything. `impress:init` event data gives you everything you
        // need to control the presentation that was just initialized.
        var api = event.detail.api;

        // KEYBOARD NAVIGATION HANDLERS

        // Prevent default keydown action when one of supported key is pressed.
        document.addEventListener( "keydown", function( event ) {
            if ( event.keyCode === 9 ||
               ( event.keyCode >= 32 && event.keyCode <= 34 ) ||
               ( event.keyCode >= 37 && event.keyCode <= 40 ) ) {
                event.preventDefault();
            }
        }, false );

        // Trigger impress action (next or prev) on keyup.

        // Supported keys are:
        // [space] - quite common in presentation software to move forward
        // [up] [right] / [down] [left] - again common and natural addition,
        // [pgdown] / [pgup] - often triggered by remote controllers,
        // [tab] - this one is quite controversial, but the reason it ended up on
        //   this list is quite an interesting story... Remember that strange part
        //   in the impress.js code where window is scrolled to 0,0 on every presentation
        //   step, because sometimes browser scrolls viewport because of the focused element?
        //   Well, the [tab] key by default navigates around focusable elements, so clicking
        //   it very often caused scrolling to focused element and breaking impress.js
        //   positioning. I didn't want to just prevent this default action, so I used [tab]
        //   as another way to moving to next step... And yes, I know that for the sake of
        //   consistency I should add [shift+tab] as opposite action...
        document.addEventListener( "keyup", function( event ) {

            if ( event.shiftKey || event.altKey || event.ctrlKey || event.metaKey ) {
                return;
            }

            if ( event.keyCode === 9 ||
               ( event.keyCode >= 32 && event.keyCode <= 34 ) ||
               ( event.keyCode >= 37 && event.keyCode <= 40 ) ) {
                switch ( event.keyCode ) {
                    case 33: // Page up
                    case 37: // Left
                    case 38: // Up
                             api.prev();
                             break;
                    case 9:  // Tab
                    case 32: // Space
                    case 34: // Page down
                    case 39: // Right
                    case 40: // Down
                             api.next();
                             break;
                }

                event.preventDefault();
            }
        }, false );

        // Delegated handler for clicking on the links to presentation steps
        document.addEventListener( "click", function( event ) {

            // Event delegation with "bubbling"
            // Check if event target (or any of its parents is a link)
            var target = event.target;
            while ( ( target.tagName !== "A" ) &&
                    ( target !== document.documentElement ) ) {
                target = target.parentNode;
            }

            if ( target.tagName === "A" ) {
                var href = target.getAttribute( "href" );

                // If it's a link to presentation step, target this step
                if ( href && href[ 0 ] === "#" ) {
                    target = document.getElementById( href.slice( 1 ) );
                }
            }

            if ( api.goto( target ) ) {
                event.stopImmediatePropagation();
                event.preventDefault();
            }
        }, false );

        // Delegated handler for clicking on step elements
        document.addEventListener( "click", function( event ) {
            var target = event.target;

            // Find closest step element that is not active
            while ( !( target.classList.contains( "step" ) &&
                      !target.classList.contains( "active" ) ) &&
                      ( target !== document.documentElement ) ) {
                target = target.parentNode;
            }

            if ( api.goto( target ) ) {
                event.preventDefault();
            }
        }, false );

        // Touch handler to detect taps on the left and right side of the screen
        // based on awesome work of @hakimel: https://github.com/hakimel/reveal.js
        document.addEventListener( "touchstart", function( event ) {
            if ( event.touches.length === 1 ) {
                var x = event.touches[ 0 ].clientX,
                    width = window.innerWidth * 0.3,
                    result = null;

                if ( x < width ) {
                    result = api.prev();
                } else if ( x > window.innerWidth - width ) {
                    result = api.next();
                }

                if ( result ) {
                    event.preventDefault();
                }
            }
        }, false );

        // Rescale presentation when window is resized
        window.addEventListener( "resize", throttle( function() {

            // Force going to active step again, to trigger rescaling
            api.goto( document.querySelector( ".step.active" ), 500 );
        }, 250 ), false );

    }, false );

} )( document, window );

// THAT'S ALL FOLKS!
//
// Thanks for reading it all.
// Or thanks for scrolling down and reading the last part.
//
// I've learnt a lot when building impress.js and I hope this code and comments
// will help somebody learn at least some part of it.

/**
 * ghostHunter - 0.3.5
 * Copyright (C) 2014 Jamal Neufeld (jamal@i11u.me)
 * MIT Licensed
 * @license
 */
(function($) {

    /* The lunr 0.7.0 library is included here to perform the fulltext searching. lunr is copyright (C) 2016 Oliver Nightingale. MIT Licensed */
    function isChineseChar(t) {
        var e = /[\u4E00-\u9FA5\uF900-\uFA2D]/;
        return e.test(t)
    }
    var lunr = function(t) {
        var e = new lunr.Index;
        return e.pipeline.add(lunr.trimmer, lunr.stopWordFilter, lunr.stemmer), t && t.call(e, e), e
    };
    lunr.version = "0.5.3", lunr.utils = {}, lunr.utils.warn = function(t) {
        return function(e) {
            t.console && console.warn && console.warn(e)
        }
    }(this), lunr.EventEmitter = function() {
        this.events = {}
    }, lunr.EventEmitter.prototype.addListener = function() {
        var t = Array.prototype.slice.call(arguments),
            e = t.pop(),
            n = t;
        if ("function" != typeof e) throw new TypeError("last argument must be a function");
        n.forEach(function(t) {
            this.hasHandler(t) || (this.events[t] = []), this.events[t].push(e)
        }, this)
    }, lunr.EventEmitter.prototype.removeListener = function(t, e) {
        if (this.hasHandler(t)) {
            var n = this.events[t].indexOf(e);
            this.events[t].splice(n, 1), this.events[t].length || delete this.events[t]
        }
    }, lunr.EventEmitter.prototype.emit = function(t) {
        if (this.hasHandler(t)) {
            var e = Array.prototype.slice.call(arguments, 1);
            this.events[t].forEach(function(t) {
                t.apply(void 0, e)
            })
        }
    }, lunr.EventEmitter.prototype.hasHandler = function(t) {
        return t in this.events
    }, lunr.tokenizer = function(t) {
        if (!arguments.length || null == t || void 0 == t) return [];
        if (Array.isArray(t)) return t.map(function(t) {
            return t.toLowerCase()
        });
        for (var e = t.toString().replace(/^\s+/, ""), n = e.length - 1; n >= 0; n--)
            if (/\S/.test(e.charAt(n))) {
                e = e.substring(0, n + 1);
                break
            }
        var r = e.split(/[\ |\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|︰-ﾠ|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]+/).map(function(t) {
            return t.replace(/[\ |\~|\`|\!|\@|\#|\$|\%|\^|\&|\*|\uFE30-\uFFA0|\(|\)|\-|\_|\+|\=|\||\\|\[|\]|\{|\}|\;|\:|\"|\'|\,|\<|\.|\>|\/|\?]/g, "").toLowerCase()
        });
        return r
    }, lunr.Pipeline = function() {
        this._stack = []
    }, lunr.Pipeline.registeredFunctions = {}, lunr.Pipeline.registerFunction = function(t, e) {
        e in this.registeredFunctions && lunr.utils.warn("Overwriting existing registered function: " + e), t.label = e, lunr.Pipeline.registeredFunctions[t.label] = t
    }, lunr.Pipeline.warnIfFunctionNotRegistered = function(t) {
        var e = t.label && t.label in this.registeredFunctions;
        e || lunr.utils.warn("Function is not registered with pipeline. This may cause problems when serialising the index.\n", t)
    }, lunr.Pipeline.load = function(t) {
        var e = new lunr.Pipeline;
        return t.forEach(function(t) {
            var n = lunr.Pipeline.registeredFunctions[t];
            if (!n) throw new Error("Cannot load un-registered function: " + t);
            e.add(n)
        }), e
    }, lunr.Pipeline.prototype.add = function() {
        var t = Array.prototype.slice.call(arguments);
        t.forEach(function(t) {
            lunr.Pipeline.warnIfFunctionNotRegistered(t), this._stack.push(t)
        }, this)
    }, lunr.Pipeline.prototype.after = function(t, e) {
        lunr.Pipeline.warnIfFunctionNotRegistered(e);
        var n = this._stack.indexOf(t) + 1;
        this._stack.splice(n, 0, e)
    }, lunr.Pipeline.prototype.before = function(t, e) {
        lunr.Pipeline.warnIfFunctionNotRegistered(e);
        var n = this._stack.indexOf(t);
        this._stack.splice(n, 0, e)
    }, lunr.Pipeline.prototype.remove = function(t) {
        var e = this._stack.indexOf(t);
        this._stack.splice(e, 1)
    }, lunr.Pipeline.prototype.run = function(t) {
        for (var e = [], n = t.length, r = this._stack.length, i = 0; i < n; i++) {
            for (var o = t[i], s = 0; s < r && (o = this._stack[s](o, i, t), void 0 !== o); s++);
            void 0 !== o && e.push(o)
        }
        return e
    }, lunr.Pipeline.prototype.reset = function() {
        this._stack = []
    }, lunr.Pipeline.prototype.toJSON = function() {
        return this._stack.map(function(t) {
            return lunr.Pipeline.warnIfFunctionNotRegistered(t), t.label
        })
    }, lunr.Vector = function() {
        this._magnitude = null, this.list = void 0, this.length = 0
    }, lunr.Vector.Node = function(t, e, n) {
        this.idx = t, this.val = e, this.next = n
    }, lunr.Vector.prototype.insert = function(t, e) {
        var n = this.list;
        if (!n) return this.list = new lunr.Vector.Node(t, e, n), this.length++;
        for (var r = n, i = n.next; void 0 != i;) {
            if (t < i.idx) return r.next = new lunr.Vector.Node(t, e, i), this.length++;
            r = i, i = i.next
        }
        return r.next = new lunr.Vector.Node(t, e, i), this.length++
    }, lunr.Vector.prototype.magnitude = function() {
        if (this._magniture) return this._magnitude;
        for (var t, e = this.list, n = 0; e;) t = e.val, n += t * t, e = e.next;
        return this._magnitude = Math.sqrt(n)
    }, lunr.Vector.prototype.dot = function(t) {
        for (var e = this.list, n = t.list, r = 0; e && n;) e.idx < n.idx ? e = e.next : e.idx > n.idx ? n = n.next : (r += e.val * n.val, e = e.next, n = n.next);
        return r
    }, lunr.Vector.prototype.similarity = function(t) {
        return this.dot(t) / (this.magnitude() * t.magnitude())
    }, lunr.SortedSet = function() {
        this.length = 0, this.elements = []
    }, lunr.SortedSet.load = function(t) {
        var e = new this;
        return e.elements = t, e.length = t.length, e
    }, lunr.SortedSet.prototype.add = function() {
        Array.prototype.slice.call(arguments).forEach(function(t) {
            ~this.indexOf(t) || this.elements.splice(this.locationFor(t), 0, t)
        }, this), this.length = this.elements.length
    }, lunr.SortedSet.prototype.toArray = function() {
        return this.elements.slice()
    }, lunr.SortedSet.prototype.map = function(t, e) {
        return this.elements.map(t, e)
    }, lunr.SortedSet.prototype.forEach = function(t, e) {
        return this.elements.forEach(t, e)
    }, lunr.SortedSet.prototype.indexOf = function(t, e, n) {
        var e = e || 0,
            n = n || this.elements.length,
            r = n - e,
            i = e + Math.floor(r / 2),
            o = this.elements[i];
        return r <= 1 ? o === t ? i : -1 : o < t ? this.indexOf(t, i, n) : o > t ? this.indexOf(t, e, i) : o === t ? i : void 0
    }, lunr.SortedSet.prototype.locationFor = function(t, e, n) {
        var e = e || 0,
            n = n || this.elements.length,
            r = n - e,
            i = e + Math.floor(r / 2),
            o = this.elements[i];
        if (r <= 1) {
            if (o > t) return i;
            if (o < t) return i + 1
        }
        return o < t ? this.locationFor(t, i, n) : o > t ? this.locationFor(t, e, i) : void 0
    }, lunr.SortedSet.prototype.intersect = function(t) {
        for (var e = new lunr.SortedSet, n = 0, r = 0, i = this.length, o = t.length, s = this.elements, l = t.elements;;) {
            if (n > i - 1 || r > o - 1) break;
            s[n] !== l[r] ? s[n] < l[r] ? n++ : s[n] > l[r] && r++ : (e.add(s[n]), n++, r++)
        }
        return e
    }, lunr.SortedSet.prototype.clone = function() {
        var t = new lunr.SortedSet;
        return t.elements = this.toArray(), t.length = t.elements.length, t
    }, lunr.SortedSet.prototype.union = function(t) {
        var e, n, r;
        return this.length >= t.length ? (e = this, n = t) : (e = t, n = this), r = e.clone(), r.add.apply(r, n.toArray()), r
    }, lunr.SortedSet.prototype.toJSON = function() {
        return this.toArray()
    }, lunr.Index = function() {
        this._fields = [], this._ref = "id", this.pipeline = new lunr.Pipeline, this.documentStore = new lunr.Store, this.tokenStore = new lunr.TokenStore, this.corpusTokens = new lunr.SortedSet, this.eventEmitter = new lunr.EventEmitter, this._idfCache = {}, this.on("add", "remove", "update", function() {
            this._idfCache = {}
        }.bind(this))
    }, lunr.Index.prototype.on = function() {
        var t = Array.prototype.slice.call(arguments);
        return this.eventEmitter.addListener.apply(this.eventEmitter, t)
    }, lunr.Index.prototype.off = function(t, e) {
        return this.eventEmitter.removeListener(t, e)
    }, lunr.Index.load = function(t) {
        t.version !== lunr.version && lunr.utils.warn("version mismatch: current " + lunr.version + " importing " + t.version);
        var e = new this;
        return e._fields = t.fields, e._ref = t.ref, e.documentStore = lunr.Store.load(t.documentStore), e.tokenStore = lunr.TokenStore.load(t.tokenStore), e.corpusTokens = lunr.SortedSet.load(t.corpusTokens), e.pipeline = lunr.Pipeline.load(t.pipeline), e
    }, lunr.Index.prototype.field = function(t, e) {
        var e = e || {},
            n = {
                name: t,
                boost: e.boost || 1
            };
        return this._fields.push(n), this
    }, lunr.Index.prototype.ref = function(t) {
        return this._ref = t, this
    }, lunr.Index.prototype.add = function(t, e) {
        var n = {},
            r = new lunr.SortedSet,
            i = t[this._ref],
            e = void 0 === e || e;
        this._fields.forEach(function(e) {
            var i = this.pipeline.run(lunr.tokenizer(t[e.name]));
            n[e.name] = i, lunr.SortedSet.prototype.add.apply(r, i)
        }, this), this.documentStore.set(i, r), lunr.SortedSet.prototype.add.apply(this.corpusTokens, r.toArray());
        for (var o = 0; o < r.length; o++) {
            var s = r.elements[o],
                l = this._fields.reduce(function(t, e) {
                    var r = n[e.name].length;
                    if (!r) return t;
                    var i = n[e.name].filter(function(t) {
                        return t === s
                    }).length;
                    return t + i / r * e.boost
                }, 0);
            this.tokenStore.add(s, {
                ref: i,
                tf: l
            })
        }
        e && this.eventEmitter.emit("add", t, this)
    }, lunr.Index.prototype.remove = function(t, e) {
        var n = t[this._ref],
            e = void 0 === e || e;
        if (this.documentStore.has(n)) {
            var r = this.documentStore.get(n);
            this.documentStore.remove(n), r.forEach(function(t) {
                this.tokenStore.remove(t, n)
            }, this), e && this.eventEmitter.emit("remove", t, this)
        }
    }, lunr.Index.prototype.update = function(t, e) {
        var e = void 0 === e || e;
        this.remove(t, !1), this.add(t, !1), e && this.eventEmitter.emit("update", t, this)
    }, lunr.Index.prototype.idf = function(t) {
        var e = "@" + t;
        if (Object.prototype.hasOwnProperty.call(this._idfCache, e)) return this._idfCache[e];
        var n = this.tokenStore.count(t),
            r = 1;
        return n > 0 && (r = 1 + Math.log(this.tokenStore.length / n)), this._idfCache[e] = r
    }, lunr.Index.prototype.search = function(t) {
        var e = this.pipeline.run(lunr.tokenizer(t)),
            n = new lunr.Vector,
            r = [],
            i = this._fields.reduce(function(t, e) {
                return t + e.boost
            }, 0),
            o = e.some(function(t) {
                return this.tokenStore.has(t)
            }, this);
        if (!o) return [];
        e.forEach(function(t, e, o) {
            var s = 1 / o.length * this._fields.length * i,
                l = this,
                u = this.tokenStore.expand(t).reduce(function(e, r) {
                    var i = l.corpusTokens.indexOf(r),
                        o = l.idf(r),
                        u = 1,
                        a = new lunr.SortedSet;
                    if (r !== t) {
                        var h = Math.max(3, r.length - t.length);
                        u = 1 / Math.log(h)
                    }
                    return i > -1 && n.insert(i, s * o * u), Object.keys(l.tokenStore.get(r)).forEach(function(t) {
                        a.add(t)
                    }), e.union(a)
                }, new lunr.SortedSet);
            r.push(u)
        }, this);
        var s = r.reduce(function(t, e) {
            return t.intersect(e)
        });
        return s.map(function(t) {
            return {
                ref: t,
                score: n.similarity(this.documentVector(t))
            }
        }, this).sort(function(t, e) {
            return e.score - t.score
        })
    }, lunr.Index.prototype.documentVector = function(t) {
        for (var e = this.documentStore.get(t), n = e.length, r = new lunr.Vector, i = 0; i < n; i++) {
            var o = e.elements[i],
                s = this.tokenStore.get(o)[t].tf,
                l = this.idf(o);
            r.insert(this.corpusTokens.indexOf(o), s * l)
        }
        return r
    }, lunr.Index.prototype.toJSON = function() {
        return {
            version: lunr.version,
            fields: this._fields,
            ref: this._ref,
            documentStore: this.documentStore.toJSON(),
            tokenStore: this.tokenStore.toJSON(),
            corpusTokens: this.corpusTokens.toJSON(),
            pipeline: this.pipeline.toJSON()
        }
    }, lunr.Index.prototype.use = function(t) {
        var e = Array.prototype.slice.call(arguments, 1);
        e.unshift(this), t.apply(this, e)
    }, lunr.Store = function() {
        this.store = {}, this.length = 0
    }, lunr.Store.load = function(t) {
        var e = new this;
        return e.length = t.length, e.store = Object.keys(t.store).reduce(function(e, n) {
            return e[n] = lunr.SortedSet.load(t.store[n]), e
        }, {}), e
    }, lunr.Store.prototype.set = function(t, e) {
        this.store[t] = e, this.length = Object.keys(this.store).length
    }, lunr.Store.prototype.get = function(t) {
        return this.store[t]
    }, lunr.Store.prototype.has = function(t) {
        return t in this.store
    }, lunr.Store.prototype.remove = function(t) {
        this.has(t) && (delete this.store[t], this.length--)
    }, lunr.Store.prototype.toJSON = function() {
        return {
            store: this.store,
            length: this.length
        }
    }, lunr.stemmer = function() {
        var t = {
                ational: "ate",
                tional: "tion",
                enci: "ence",
                anci: "ance",
                izer: "ize",
                bli: "ble",
                alli: "al",
                entli: "ent",
                eli: "e",
                ousli: "ous",
                ization: "ize",
                ation: "ate",
                ator: "ate",
                alism: "al",
                iveness: "ive",
                fulness: "ful",
                ousness: "ous",
                aliti: "al",
                iviti: "ive",
                biliti: "ble",
                logi: "log"
            },
            e = {
                icate: "ic",
                ative: "",
                alize: "al",
                iciti: "ic",
                ical: "ic",
                ful: "",
                ness: ""
            },
            n = "[^aeiou]",
            r = "[aeiouy]",
            i = n + "[^aeiouy]*",
            o = r + "[aeiou]*",
            s = "^(" + i + ")?" + o + i,
            l = "^(" + i + ")?" + o + i + "(" + o + ")?$",
            u = "^(" + i + ")?" + o + i + o + i,
            a = "^(" + i + ")?" + r;
        return function(n) {
            var o, h, c, p, f, d, v;
            if (n.length < 3) return n;
            if (c = n.substr(0, 1), "y" == c && (n = c.toUpperCase() + n.substr(1)), p = /^(.+?)(ss|i)es$/, f = /^(.+?)([^s])s$/, p.test(n) ? n = n.replace(p, "$1$2") : f.test(n) && (n = n.replace(f, "$1$2")), p = /^(.+?)eed$/, f = /^(.+?)(ed|ing)$/, p.test(n)) {
                var m = p.exec(n);
                p = new RegExp(s), p.test(m[1]) && (p = /.$/, n = n.replace(p, ""))
            } else if (f.test(n)) {
                var m = f.exec(n);
                o = m[1], f = new RegExp(a), f.test(o) && (n = o, f = /(at|bl|iz)$/, d = new RegExp("([^aeiouylsz])\\1$"), v = new RegExp("^" + i + r + "[^aeiouwxy]$"), f.test(n) ? n += "e" : d.test(n) ? (p = /.$/, n = n.replace(p, "")) : v.test(n) && (n += "e"))
            }
            if (p = /^(.+?[^aeiou])y$/, p.test(n)) {
                var m = p.exec(n);
                o = m[1], n = o + "i"
            }
            if (p = /^(.+?)(ational|tional|enci|anci|izer|bli|alli|entli|eli|ousli|ization|ation|ator|alism|iveness|fulness|ousness|aliti|iviti|biliti|logi)$/, p.test(n)) {
                var m = p.exec(n);
                o = m[1], h = m[2], p = new RegExp(s), p.test(o) && (n = o + t[h])
            }
            if (p = /^(.+?)(icate|ative|alize|iciti|ical|ful|ness)$/, p.test(n)) {
                var m = p.exec(n);
                o = m[1], h = m[2], p = new RegExp(s), p.test(o) && (n = o + e[h])
            }
            if (p = /^(.+?)(al|ance|ence|er|ic|able|ible|ant|ement|ment|ent|ou|ism|ate|iti|ous|ive|ize)$/, f = /^(.+?)(s|t)(ion)$/, p.test(n)) {
                var m = p.exec(n);
                o = m[1], p = new RegExp(u), p.test(o) && (n = o)
            } else if (f.test(n)) {
                var m = f.exec(n);
                o = m[1] + m[2], f = new RegExp(u), f.test(o) && (n = o)
            }
            if (p = /^(.+?)e$/, p.test(n)) {
                var m = p.exec(n);
                o = m[1], p = new RegExp(u), f = new RegExp(l), d = new RegExp("^" + i + r + "[^aeiouwxy]$"), (p.test(o) || f.test(o) && !d.test(o)) && (n = o)
            }
            return p = /ll$/, f = new RegExp(u), p.test(n) && f.test(n) && (p = /.$/, n = n.replace(p, "")), "y" == c && (n = c.toLowerCase() + n.substr(1)), n
        }
    }(), lunr.Pipeline.registerFunction(lunr.stemmer, "stemmer"), lunr.stopWordFilter = function(t) {
        if (lunr.stopWordFilter.stopWords.indexOf(t) === -1) return t
    }, lunr.stopWordFilter.stopWords = new lunr.SortedSet, lunr.stopWordFilter.stopWords.length = 119, lunr.stopWordFilter.stopWords.elements = ["", "a", "able", "about", "across", "after", "all", "almost", "also", "am", "among", "an", "and", "any", "are", "as", "at", "be", "because", "been", "but", "by", "can", "cannot", "could", "dear", "did", "do", "does", "either", "else", "ever", "every", "for", "from", "get", "got", "had", "has", "have", "he", "her", "hers", "him", "his", "how", "however", "i", "if", "in", "into", "is", "it", "its", "just", "least", "let", "like", "likely", "may", "me", "might", "most", "must", "my", "neither", "no", "nor", "not", "of", "off", "often", "on", "only", "or", "other", "our", "own", "rather", "said", "say", "says", "she", "should", "since", "so", "some", "than", "that", "the", "their", "them", "then", "there", "these", "they", "this", "tis", "to", "too", "twas", "us", "wants", "was", "we", "were", "what", "when", "where", "which", "while", "who", "whom", "why", "will", "with", "would", "yet", "you", "your"], lunr.Pipeline.registerFunction(lunr.stopWordFilter, "stopWordFilter"), lunr.trimmer = function(t) {
        return isChineseChar(t) ? t : t.replace(/^\W+/, "").replace(/\W+$/, "")
    }, lunr.Pipeline.registerFunction(lunr.trimmer, "trimmer"), lunr.TokenStore = function() {
        this.root = {
            docs: {}
        }, this.length = 0
    }, lunr.TokenStore.load = function(t) {
        var e = new this;
        return e.root = t.root, e.length = t.length, e
    }, lunr.TokenStore.prototype.add = function(t, e, n) {
        var n = n || this.root,
            r = t[0],
            i = t.slice(1);
        return r in n || (n[r] = {
            docs: {}
        }), 0 === i.length ? (n[r].docs[e.ref] = e, void(this.length += 1)) : this.add(i, e, n[r])
    }, lunr.TokenStore.prototype.has = function(t) {
        if (!t) return !1;
        for (var e = this.root, n = 0; n < t.length; n++) {
            if (!e[t[n]]) return !1;
            e = e[t[n]]
        }
        return !0
    }, lunr.TokenStore.prototype.getNode = function(t) {
        if (!t) return {};
        for (var e = this.root, n = 0; n < t.length; n++) {
            if (!e[t[n]]) return {};
            e = e[t[n]]
        }
        return e
    }, lunr.TokenStore.prototype.get = function(t, e) {
        return this.getNode(t, e).docs || {}
    }, lunr.TokenStore.prototype.count = function(t, e) {
        return Object.keys(this.get(t, e)).length
    }, lunr.TokenStore.prototype.remove = function(t, e) {
        if (t) {
            for (var n = this.root, r = 0; r < t.length; r++) {
                if (!(t[r] in n)) return;
                n = n[t[r]]
            }
            delete n.docs[e]
        }
    }, lunr.TokenStore.prototype.expand = function(t, e) {
        var n = this.getNode(t),
            r = n.docs || {},
            e = e || [];
        return Object.keys(r).length && e.push(t), Object.keys(n).forEach(function(n) {
            "docs" !== n && e.concat(this.expand(t + n, e))
        }, this), e
    }, lunr.TokenStore.prototype.toJSON = function() {
        return {
            root: this.root,
            length: this.length
        }
    };

    //This is the main plugin definition
    $.fn.ghostHunter = function(options) {

        //Here we use jQuery's extend to set default values if they weren't set by the user
        var opts = $.extend({}, $.fn.ghostHunter.defaults, options);
        if (opts.results) {
            pluginMethods.init(this, opts);
            return pluginMethods;
        }
    };

    $.fn.ghostHunter.defaults = {
        resultsData: false,
        onPageLoad: false,
        onKeyUp: false,
        result_template: "<a href='{{link}}'><p><h2>{{title}}</h2><h4>{{pubDate}}</h4></p></a>",
        info_template: "<p>Number of posts found: {{amount}}</p>",
        displaySearchInfo: true,
        zeroResultsInfo: true,
        before: false,
        onComplete: false,
        includepages: false,
        filterfields: false,
        search_path: '/blog/search.xml'
    };
    var prettyDate = function(date) {
        var d = new Date(date);
        var monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
        return d.getDate() + ' ' + monthNames[d.getMonth()] + ' ' + d.getFullYear();
    };

    var pluginMethods = {

        isInit: false,

        init: function(target, opts) {
            var that = this;
            this.target = target;
            this.results = opts.results;
            this.blogData = {};
            this.result_template = opts.result_template;
            this.info_template = opts.info_template;
            this.zeroResultsInfo = opts.zeroResultsInfo;
            this.displaySearchInfo = opts.displaySearchInfo;
            this.before = opts.before;
            this.onComplete = opts.onComplete;
            this.includepages = opts.includepages;
            this.filterfields = opts.filterfields;
            this.search_path = opts.search_path;

            //This is where we'll build the index for later searching. It's not a big deal to build it on every load as it takes almost no space without data
            this.index = lunr(function() {
                //this.field('title', {boost: 10})
                this.field('description')
                    //this.field('link')
                    //this.field('markdown', {boost: 5})
                    //this.field('pubDate')
                this.field('tag')
                this.ref('id')
            });

            if (opts.onPageLoad) {
                that.loadAPI();
            } else {
                target.focus(function() {
                    that.loadAPI();
                });
            }

            target.closest("form").submit(function(e) {
                e.preventDefault();
                that.find(target.val());
            });

            if (opts.onKeyUp) {
                target.keyup(function() {
                    that.find(target.val());
                });

            }

        },

        loadAPI: function() {

            if (this.isInit) return false;

            /*	Here we load all of the blog posts to the index. 
			This function will not call on load to avoid unnecessary heavy 
			operations on a page if a visitor never ends up searching anything. */

            var index = this.index,
                blogData = this.blogData;
            obj = {
                limit: "all",
                include: "tags"
            };
            if (this.includepages) {
                obj.filter = "(page:true,page:false)";
            }


            $.get(this.search_path).done(function(data) {
                searchData = $(data).find("entry");
                for(var i = 0; searchData && i < searchData.length;i++){
                    var post = $(searchData[i]);
                    var parsedData = {
                        id: i + 1,
                        //title: post.find("title").text(),
                        description: post.find("description").text(),
                        //pubDate: post.find("date").text(),
                        //link: post.find("url").text(),
                        tag: post.find("tag").text()
                    };
                    index.add(parsedData)
                    blogData[i+1] = {
                        title: post.find("title").text(),
                        link: post.find("url").text(),
                        pubDate: post.find("date").text()
                    };
                }
            });
            this.isInit = true;
        },

        find: function(value) {
            var searchResult = this.index.search(value);
            var results = $(this.results);
            var resultsData = [];
            results.empty();

            if (this.before) {
                this.before();
            };

            if (this.zeroResultsInfo || searchResult.length > 0) {
                if (this.displaySearchInfo) results.append(this.format(this.info_template, {
                    "amount": searchResult.length
                }));
            }
            results.append('<ul></ul>');
            var maxResult = 10;
            var flag = false;
            for (var i = 0; i < searchResult.length; i++) {
                if(i >= maxResult){
                    flag = true;
                    break;
                }
                var lunrref = searchResult[i].ref;
                var postData = this.blogData[lunrref];
                results.find('ul').append(this.format(this.result_template, postData));
                resultsData.push(postData);
            }
            if(flag){
                var html = '<li class="load-more" style="color:#4a75b5;cursor:pointer">显示全部搜索结果</li>';
                results.find('ul').append(html);
            }
            $('.load-more').click(function(){
                results.find('ul .load-more').remove();
                for (var i = maxResult; i < searchResult.length; i++){
                    var lunrref = searchResult[i].ref;
                    var postData = this.blogData[lunrref];
                    results.find('ul').append(this.format(this.result_template, postData));
                }
            }.bind(this));
            if (this.onComplete) {
                this.onComplete(resultsData);
            };
        },

        clear: function() {
            $(this.results).empty();
            this.target.val("");
        },

        format: function(t, d) {
            return t.replace(/{{([^{}]*)}}/g, function(a, b) {
                var r = d[b];
                return typeof r === 'string' || typeof r === 'number' ? r : a;
            });
        }
    }

})(jQuery);
var my_fun = {
	init : function(){
		this.insertWeiBo();
		this.searchModule();
        this.back_to_top();
        this.go_to_comments();
	},
	insertWeiBo : function(){
		var weibo_html = '<iframe width="330" height="400" class="share_self"  frameborder="0" scrolling="no" src="http://widget.weibo.com/weiboshow/index.php?language=&width=0&height=550&fansRow=2&ptype=1&speed=0&skin=1&isTitle=0&noborder=0&isWeibo=1&isFans=0&uid=3822969136&verifier=d420dd2b&dpc=1"></iframe>';
		var $w_b = $('.weibo-frame');
		if($('.blog-content').width() > 650){
			if(!$w_b.find('iframe').length){
				$w_b.append(weibo_html);
			}
		}
	},
    searchModule : function() {
        var $openSearchBtn = $('.search-icon');
        var $closeSearchBtn = $('.close-icon');
        var $bigSearchContainer = $('.big-search');
        // ghost hunter init
        var ghostHunter = $('.js-search-input').ghostHunter({
            results: '.js-search-results',
            info_template: "<p>搜索结果 : {{amount}}</p>",
            result_template: '<li><a href="{{link}}">{{title}}</a><span>{{pubDate}}</span></li>',
            onKeyUp: true
        });
        $openSearchBtn.on('click', function(e) {
            e.preventDefault();
            $bigSearchContainer.addClass('open');
            $(window).scrollTop(0);
            $bigSearchContainer.find('input[type=text]').focus();
        });
        $closeSearchBtn.on('click', function(e) {
            e.preventDefault();
            ghostHunter.clear();
            $bigSearchContainer.removeClass('open');
        });
    },
    back_to_top : function(){
        var $toTop = $('.back-to-top');
        $(window).on("scroll", function() {
            if ($(window).scrollTop() >= $(window).height()) {
                $toTop.css("display", "block").fadeIn();
            } else {
                $toTop.fadeOut();
            }
        });
        $toTop.on("click", function(e) {
            var $obj = $("body,html");
            $obj.animate({
                scrollTop: 0
            }, 500);
            e.preventDefault();
        });
    },
    go_to_comments : function(){
        $(".goto-comments").on("click", function(e) {
            e.preventDefault();
            if (/#comments/.test(window.location.href)) {
                window.location.href = window.location.href;
            } else {
                window.location.hash = "#comments";
            }
        });
    }
};
$(function(){
	my_fun.init();
});
$(window).on("resize", function() {
    my_fun.insertWeiBo();
});