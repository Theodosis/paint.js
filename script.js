function pos( e ){
    var x, y;
    if( e.offsetX && e.offsetY ){
        return { x: e.offsetX, y: e.offsetY };
    }
    if( e.originalTarget && e.originalTarget.offsetParent ){
        return {
            x: e.clientX - e.originalTarget.offsetLeft,
            y: e.clientY - e.originalTarget.offsetTop
        };
    }
    return false;
}
Object.prototype.clone = function() {
    var newObj = ( this instanceof Array ) ? [] : {};
    for ( i in this ) {
        if ( i == 'clone' ){
            continue;
        }
        if ( this[ i ] && typeof this[ i ] == "object" ) {
            newObj[ i ] = this[ i ].clone();
        } 
        else {
            newObj[ i ] = this[ i ];
        }
    } 
    return newObj;
};
var BlackBoard = {
    active: null,//active tool
    stack: [],
    globals: {
        write: true,
        background: '#000',
        visible: true,
        Line: {
            user: 'ted',
            type: 'line',
            visible: true,
            data: {
                color: '#fff',
                width: 3,
                linecap: 'round',
                linejoin: 'round',
                correction: { x: 0, y: 13 },
                lines: []
            }
        },
        Sponge: {
            user: 'ted',
            type: 'sponge',
            visible: true,
            data: {
                //color: BB.globals.background, Used dynamicaly
                width: 16,
                correction: { x: 8, y: 8 }
            }
        },
        Clear: {
            user: 'ted',
            type: 'clear',
            visible: true
        }
    },
    Tools: {
        SetBackground: function( color ){
            BB.globals.background = color;
            BB.ctx.fillColor = color;
            this.RebuildWorld();
        },
        SetColor: function( color ){
            BB.globals.color = color;
            BB.ctx.strokeStyle = color;
        },
        SetLineWidth: function( pixels ){
            BB.globals.Line.width = pixels;
            BB.ctx.lineWidth = pixels;
        },
        SetSpongeWidth: function( pixels ){
            BB.globals.Sponge.width = pixels;
            BB.ctx.lineWidth = pixels;
        },
        SetLinecap: function( cap ){
            BB.globals.linecap = cap;
            BB.ctx.lineCap = cap;
        },
        SetLinejoin: function( join ){
            BB.globals.linejoin = join;
            BB.ctx.lineJoin = join;
        },
        SetFont: function(){},
        RebuildWorld: function(){
            this.Clear( true );
            var start = 0;
            for( var i = BB.stack.length - 1; i >= 0; --i ){
                if( BB.stack[ i ].type == 'clear' && BB.stack[ i ].visible ){
                    start = i + 1;
                    break;
                }
            }
            for( var i = start; i < BB.stack.length; ++i ){
                if( !BB.stack[ i ].visible ){
                    continue;
                }
                switch( BB.stack[ i ].type ){
                    case 'line':
                        (new BB.Line).Draw( BB.stack[ i ].data.clone() );
                        break;
                    case 'sponge':
                        (new BB.Sponge).Draw( BB.stack[ i ].data.clone() );
                        break;
                    /* optimized
                    case 'clear':
                        BB.Tools.Clear( true );
                    */
                }
            }
        },
        Clear: function( ignore ){
            BB.ctx.fillRect( 0, 0, BB.ctx.canvas.width, BB.ctx.canvas.height );
            BB.ctx.fill();
            if( ignore !== true ){
                BB.stack.push( BB.globals.Clear.clone() );
            }
        },
        Undo: function(){
            var i = BB.stack.length - 1;
            while( BB.stack[ i ] && !BB.stack[ i ].visible ){
                --i;
            }
            if( i < 0 ){
                return;
            }
            BB.stack[ i ].visible = false;
            BB.Tools.RebuildWorld();
        },
        Redo: function(){ //TODO: check if a move was done after undo-ing
            var i = BB.stack.length - 1;
            while( BB.stack[ i ] && !BB.stack[ i ].visible ){
                --i;
            }
            if( i == BB.stack.length - 1 ){
                return;
            }
            BB.stack[ ++i ].visible = true;
            BB.Tools.RebuildWorld();
        },
        Action: function(){
            for( var i = BB.stack.length - 1; i >= 0; --i ){
                if( !BB.stack[ i ].visible ){
                    BB.stack.pop();
                }
            }
        }
    },
    Comments: {
        Clear: function(){
            BB.cmt.clearRect( 0, 0, BB.cmt.canvas.width, BB.cmt.canvas.height );
        },
        Cursor: {
            chalk: function(){
                var a = new Image();
                a.src = 'images/chalk16.png';
                return a;
            }(),
            Move: function( p ){
                BB.Comments.Clear();
                switch( BB.active.item.type ){
                    case 'sponge':
                        BB.cmt.strokeStyle = '#333';
                        BB.cmt.beginPath();
                        BB.cmt.arc( p.x, p.y, BB.active.item.data.width / 2, 0, Math.PI * 2, true );
                        BB.cmt.stroke();
                        BB.cmt.closePath();
                        break;
                    case 'line':
                        BB.cmt.drawImage( BB.Comments.Cursor.chalk, p.x, p.y - 16 );
                        break;
                }
            },
            Down: function(){},
            Up: function(){}
        },
        Init: function(){
            BB.cmt.canvas.onmousedown = function( e ){
                var p = pos( e );
                if( BB.active.Run ){
                    BB.Tools.Action();
                    BB.active.Run.call( BB.active, p );
                }
                if( BB.active.Start ){
                    BB.Tools.Action();
                    BB.active.Start.call( BB.active,  p );
                }
                BB.Comments.Cursor.Down();
                BB.active.down = true;
                return false;
            };
            BB.cmt.canvas.onmousemove = function( e ){
                var p = pos( e );
                BB.Comments.Cursor.Move( p );
                if( BB.active.down && BB.active.Move ){
                    BB.active.Move.call( BB.active, p );
                }
                return false;
            }
            BB.cmt.canvas.onmouseup = function( e ){
                var p = pos( e );
                //correction for click-to-paint
                p.x += 0.1;
                p.y += 0.1;
                if( BB.active.down && BB.active.Move ){
                    BB.active.Move.call( BB.active, p );
                }
                if( BB.active.down && BB.active.Stop ){
                    BB.active.Stop.call( BB.active, p );
                }
                BB.Comments.Cursor.Up();
                BB.active.down = false;
                return false;
            }
            BB.cmt.canvas.onmouseout = function( e ){
                //BB.cmt.canvas.onmouseup( e );
                BB.Comments.Clear();
            }
        }
    },
    Line: function( width ){
        if( !BB.globals.write ){
            return;
        }
        this.item = BB.globals.Line.clone();
        this.item.data.width = width;
        this.Start = function( p ){
            this.Init();
            this.item.data.lines.push( p );
            this.item.data.last = p;
            this.item.data.lastid = 1;
        };
        this.Move = function( p ){
            BB.ctx.beginPath();
            BB.ctx.moveTo( this.item.data.last.x, this.item.data.last.y );
            BB.ctx.lineTo( p.x, p.y );
            BB.ctx.stroke();
            BB.ctx.closePath();
            this.item.data.lines.push( p );
            this.item.data.last = p;
            this.item.data.lastid++;
        };
        this.Stop = function( ignore ){
            if( ignore !== true ){
                BB.stack.push( this.item.clone() );
            }
            this.item.data.lines = [];
        };
        
        this.Draw = function( data ){ //for asynchronous line creation, or world rebuild
            this.item.data = data;
            this.Init();
            BB.ctx.beginPath();
            BB.ctx.moveTo( data.lines[ 0 ].x, data.lines[ 0 ].y );
            for( var i in data.lines ){
                BB.ctx.lineTo( data.lines[ i ].x, data.lines[ i ].y );
            }
            BB.ctx.stroke();
            BB.ctx.closePath();
        };
        this.Init = function(){
            BB.Tools.SetColor( this.item.data.color );
            BB.Tools.SetLineWidth( this.item.data.width );
            BB.Tools.SetLinecap( this.item.data.linecap );
            BB.Tools.SetLinejoin( this.item.data.linejoin );
            //No need to initialize correction
        };
        this.Init();
        return this;
    },
    Sponge: function( width ){
        var a = new BB.Line();
        a.item.data.color = BB.globals.background;
        a.item.data.width = width ? width : BB.globals.Sponge.data.width;
        a.item.data.correction = BB.globals.Sponge.data.correction.clone();
        a.item.type = "sponge";
        a.Init();
        a.Stop = function( ignore ){
            if( ignore !== true ){
                BB.stack.push( this.item );
            }
            this.item = BB.globals.Line.clone();
            this.item.data.color = BB.globals.background;
            this.item.data.width = width ? width : BB.globals.Sponge.data.width;
            this.item.data.correction = BB.globals.Sponge.data.correction.clone();
            this.item.type = "sponge";
            this.Init();
        }
        return a;
    },
    Init: function(){
        //initialize draw canvas
        var canvas = document.getElementsByTagName( 'canvas' )[ 0 ];
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
        BB.ctx = canvas.getContext( '2d' );
        BB.Tools.SetBackground( '#000' );
        BB.Tools.Clear( true );
        //initialize comment canvas
        var comments = document.getElementsByTagName( 'canvas' )[ 2 ];
        comments.width = canvas.width;
        comments.height = canvas.height;
        BB.cmt = comments.getContext( '2d' );
        BB.cmt.fillStyle = 'transparent';
        BB.cmt.fillRect( 0, 0, comments.width, comments.height );
        BB.cmt.fill();
        BB.Comments.Init();
    },
}
BB = BlackBoard;

BB.Init();
$( '#chalk' ).click( function(){
    $( 'canvas' ).removeClass().addClass( 'chack' );
    $( this ).siblings().removeClass( 'selected' ).end().addClass( 'selected' );
    BB.active = new BB.Line( $( '#chalk .size' ).text() );
}).click();
$( '#sponge' ).click( function(){
    $( 'canvas' ).removeClass().addClass( 'sponge' );
    $( this ).siblings().removeClass( 'selected' ).end().addClass( 'selected' );
    BB.active = new BB.Sponge( $( '#sponge .size' ).text() );
});
$( '.toolbox li' ).mousedown( function(){
    this.down = setTimeout( function( li ){
        return function(){
            $( li ).children( 'ul' ).show();
        }
    }( this ), 500 );
    return false;
}).mouseup( function(){
    clearTimeout( this.down );
});
$( '#clear' ).click( function(){
    BB.Tools.Clear();
});
$( '#undo' ).click( function(){
    BB.Tools.Undo();
});
$( '#redo' ).click( function(){
    BB.Tools.Redo();
});
$( 'body' ).keydown( function( e ){
    switch( e.which ){
        case 85: //u, as undo
            $( '#undo' ).click();
            break;
        case 82: //r, as redo
            $( '#redo' ).click();
            break;
        case 67: //c or Ctrl+c, as chalk or clear
            if( e.ctrlKey ){
                $( '#clear' ).click();
            }
            else{
                $( '#chalk' ).click();
            }
            break;
        case 84://t, as text
            $( '#text' ).click();
            break;
        case 83://s, as sponge
            $( '#sponge' ).click();
            break;
    }
});
$( '.toolbox li#chalk ul li' ).click( function(){
    $( this ).parent().hide();
    $( '#chalk .size' ).text( $( this ).attr( 'class' ).substr( 1 ) );
    BB.Tools.SetLineWidth( $( this ).attr( 'class' ).substr( 1 ) );
});
$( '.toolbox li#sponge ul li' ).click( function(){
    $( this ).parent().hide();
    $( '#sponge .size' ).text( $( this ).attr( 'class' ).substr( 1 ) );
    BB.Tools.SetSpongeWidth( $( this ).attr( 'class' ).substr( 1 ) );
});
$( window ).resize( function(){
    BB.Init();
    BB.Tools.RebuildWorld();
});
