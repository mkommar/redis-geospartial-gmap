require( './style.scss' );

const component = {
    template: require( './template.html' ),
    props: ['loading', 'visible'],
    methods: {
        close: function() {
            this.$dispatch( 'close' );
        }
    },
    components: {
        vcuSpinner: require( '../vcu-spinner' )
    }
};

module.exports = component;