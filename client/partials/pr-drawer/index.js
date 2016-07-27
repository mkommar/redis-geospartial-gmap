require( './style.scss' );

const component = {
    template: require( './template.html' ),
    vuex: {},
    ready: function() {
        this.$nextTick( componentHandler.upgradeDom );
    }
};

module.exports = component;