import Vue from "vue";

Vue.directive( 'mdl', {
    bind: function() {
        componentHandler.upgradeElement( this.el );
    }
} );