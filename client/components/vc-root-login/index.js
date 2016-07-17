require( './style.scss' );

import MdlTab from "../mdl-tab.vue";
import MdlTabPanel from "../mdl-tab-panel.vue";

const component = {
    template: require( './template.html' ),
    vuex: {
        getters: {
            lang: ( {lang} ) => lang,
            config: ( {config} ) => config
        }
    },
    data: function() {
        return {
            tab: 'signin'
        }
    },
    components: {
        MdlTab,
        MdlTabPanel
    },
    ready: function() {
        this.$nextTick( componentHandler.upgradeDom );
    }
};

module.exports = component;