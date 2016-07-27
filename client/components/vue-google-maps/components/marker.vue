<script lang="babel">

    import _ from 'lodash';
    import eventsBinder from '../utils/eventsBinder.js';
    import propsBinder from '../utils/propsBinder.js';
    import getPropsValuesMixin from '../utils/getPropsValuesMixin.js'
    import Q from 'q';
    import MapComponent from './mapComponent';
    import assert from 'assert';

    const props = {
        animation: {
            type: Number
        },
        attribution: {
            type: Object,
        },
        clickable: {
            type: Boolean,
            default: true
        },
        cursor: {
            type: String,
        },
        draggable: {
            type: Boolean,
            default: false
        },
        icon: {
            type: Object,
        },
        label: {},
        opacity: {
            type: Number,
            default: 1
        },
        place: {
            type: Object
        },
        position: {
            type: Object,
        },
        shape: {
            type: Object,
        },
        title: {
            type: String,
        },
        zIndex: {
            type: Number,
        },
        visible: {
            default: 'auto'
        }
    };

    const events = [
        'click',
        'rightclick',
        'dblclick',
        'drag',
        'dragstart',
        'dragend',
        'mouseup',
        'mousedown',
        'mouseover',
        'mouseout'
    ];

    var container;

    /**
     * @class Marker
     *
     * Marker class with extra support for
     *
     * - Embedded info windows
     * - Clustered markers
     *
     * Support for clustered markers is for backward-compatability
     * reasons. Otherwise we should use a cluster-marker mixin or
     * subclass.
     */
    export default MapComponent.extend( {
        mixins: [getPropsValuesMixin],
        props: props,

        created() {
            this.destroyed = false;
        },

        attached() {
            if( this.visible === 'auto' )
            {
                this.visible = true;
            }
        },

        detached() {
            if( this.visible === 'auto' )
            {
                this.visible = false;
            }
        },

        destroyed() {
            this.destroyed = true;
            if( !this.$markerObject )
                return;

            if( this.$clusterObject )
            {
                this.$clusterObject.removeMarker( this.$markerObject );
            }
            else
            {
                this.$markerObject.setMap( null );
            }
        },

        deferredReady() {
            /* Send an event to any <cluster> parent */
            this.$dispatch( 'register-marker', this );

            const options = _.mapValues( props, ( value, prop ) => this[prop] );
            options.map = this.$map;
            this.createMarker( options, this.$map );
        },

        methods: {
            createMarker ( options, map ) {
                // FIXME: @Guillaumne do we need this?
                if( !this.destroyed )
                {
                    this.$markerObject = new google.maps.Marker( options );
                    propsBinder( this, this.$markerObject, props );
                    eventsBinder( this, this.$markerObject, events );

                    if( this.$clusterObject )
                    {
                        this.$clusterObject.addMarker( this.$markerObject );
                    }
                }
            }
        },

        events: {
            'register-infoWindow' ( infoWindow ) {
                infoWindow.$emit( 'marker-ready', this, this.$map );
            },
            'cluster-ready' ( cluster, map ) {
                this.$clusterObject = cluster;
            },
            'g-drag'(){
                this.position = {
                    lat: this.$markerObject.getPosition().lat(),
                    lng: this.$markerObject.getPosition().lng()
                };
            },
            'g-dragend'(){
                this.position = {
                    lat: this.$markerObject.getPosition().lat(),
                    lng: this.$markerObject.getPosition().lng()
                };
            }
        }
    } )
</script>
