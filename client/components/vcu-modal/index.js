require( './style.scss' );

const component = {
    template: require( './template.html' ),
    props: ['loading', 'visible'],
    methods: {
        close: function() {
            this.$dispatch( 'close' );
        }
    }
};

module.exports = component;