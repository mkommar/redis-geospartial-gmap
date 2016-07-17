require( './style.scss' );

const component = {
    template: require( './template.html' ),
    vuex: {
        getters: {
            config: ( {config} ) => config,
            user: ( {user} ) => user
        }
    },
    ready: function() {
        this.$nextTick( componentHandler.upgradeDom );
    }
};

module.exports = component;