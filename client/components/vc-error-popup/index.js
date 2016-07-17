require( './style.scss' );

import {hideModal} from "../../scripts/vuex/modules/modal";

const component = {
    template: require( './template.html' ),
    vuex: {
        getters: {
            visible: ( {modal} ) => modal.visible,
            title: ( {modal} ) => modal.title,
            body: ( {modal} ) => modal.body
        },
        actions: {
            hideModal
        }
    },
    methods: {
        close: function() {
            this.hideModal();
        }
    },
    components: {
        vcuModal: require( '../vcu-modal' )
    }
};

module.exports = component;