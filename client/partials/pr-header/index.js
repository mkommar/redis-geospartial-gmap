require( './style.scss' );

const component = {
    template: require( './template.html' ),
    vuex: {},
    components: {
        prNavBar: require( '../pr-nav-bar' )
    }
};

module.exports = component;