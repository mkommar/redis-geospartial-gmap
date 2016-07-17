<template>
    <div class="vc-root-login">
        <div class="mdl-card mdl-shadow--2dp">
            <div class="mdl-tabs is-upgraded ">
                <div class="mdl-tabs__tab-bar">
                    <mdl-tab tab="signin" :active.sync="tab">Sign in</mdl-tab>
                    <mdl-tab tab="signup" :active.sync="tab">Sign up</mdl-tab>
                </div>

                <mdl-tab-panel tab="signin" :active="tab">
                    <div class="mdl-card__supporting-text">
                        <!-- Google -->
                        <a :href="config.app.host+'/auth/google'"
                           class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect
                                    mdl-button--social mdl-button--google">
                            <icon class="icon" name="fa-google" size="20"></icon>
                            <span>Login with Google</span>
                        </a>
                        <!-- Facebook -->
                        <a :href="config.app.host+'/auth/facebook'"
                           class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect
                                    mdl-button--social mdl-button--facebook">
                            <icon class="icon" name="fa-facebook" size="20"></icon>
                            <span>Login with Facebook</span>
                        </a>

                        <div class="am--or">Or</div>

                        <form class="am-login-form mdl-typography--text-left" action="#">
                            <div class="mdl-textfield mdl-js-textfield">
                                <input class="mdl-textfield__input" type="text" id="si-username"/>
                                <label class="mdl-textfield__label" for="si-username">Username</label>
                            </div>
                            <div class="mdl-textfield mdl-js-textfield ">
                                <input class="mdl-textfield__input" type="password" id="si-userpass"/>
                                <label class="mdl-textfield__label" for="si-userpass">Password</label>
                            </div>
                            <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-button--login">
                                Log in
                            </button>
                            <a href="#" class="am-login-form__forgot">Forgot password?</a>
                        </form>
                    </div>
                </mdl-tab-panel>

                <mdl-tab-panel tab="signup" :active="tab">
                    <div class="mdl-card__supporting-text">
                        <!-- Google -->
                        <a :href="config.app.host+'/auth/google'"
                           class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect
                                    mdl-button--social mdl-button--google">
                            <icon class="icon" name="fa-google" size="20"></icon>
                            <span>Signup with Google</span>
                        </a>
                        <!-- Facebook -->
                        <a :href="config.app.host+'/auth/facebook'"
                           class="mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect
                                    mdl-button--social mdl-button--facebook">
                            <icon class="icon" name="fa-facebook" size="20"></icon>
                            <span>Signup with Facebook</span>
                        </a>

                        <div class="am--or">Or please enter your email and password</div>

                        <form class="am-login-form mdl-typography--text-left" action="#">
                            <div class="mdl-textfield mdl-js-textfield ">
                                <input class="mdl-textfield__input" type="text" id="su-username"/>
                                <label class="mdl-textfield__label" for="su-username">Username</label>
                            </div>
                            <div class="mdl-textfield mdl-js-textfield ">
                                <input class="mdl-textfield__input" type="password" id="su-userpass"/>
                                <label class="mdl-textfield__label" for="su-userpass">Password</label>
                            </div>
                            <button class="mdl-button mdl-js-button mdl-button--raised mdl-button--colored mdl-button--create">
                                Create account
                            </button>
                        </form>
                    </div>
                </mdl-tab-panel>
            </div>
        </div>
    </div>
</template>

<style lang="scss" scoped>
    @import "../styles/_exports";

    .vc-root-login {
        margin : 2rem 0;

        .mdl-card {
            margin : 0 auto;
        }

        .mdl-layout__content {
            padding : 24px;
            flex    : none;
        }

        .text-center {
            text-align : center;
        }
        .wrapper {
            margin : auto;
        }

        .mdl-card__supporting-text {
            text-align  : center;
            padding-top : 36px;
        }

        .mdl-button--social {
            width         : 168px;
            margin-bottom : 8px;
            font-size     : 12px;
        }

        .mdl-button--login {
            width         : 120px;
            margin-bottom : 8px;
        }

        .mdl-button--create {
            //width         : 120px;
            margin-bottom : 8px;
        }

        .am--or {
            margin-top : 16px;
            color      : $palette-grey-400;
        }

        .am-login-form {
            .mdl-textfield:nth-child(2) {
                margin-bottom : 8px;
            }
        }

        .am-login-form__forgot {
            padding-left : 24px;
        }
    }

    //
    // Social Sharing Buttons for Material Design Lite
    // by Brandon Himpfen http://www.himpfen.com/
    // --------------------------------------------------

    $twitter : #00acee;
    $facebook : #3b5998;
    $google : #4284f3;
    $googleplus : #e93f2e;
    $stumbleupon : #f74425;
    $linkedin : #0e76a8;
    $steam : #6f9e31;

    $md-colour-list : (
            twitter $twitter,
            facebook $facebook,
            googleplus $googleplus,
            google $google,
            stumbleupon $stumbleupon,
            linkedin $linkedin,
            steam $steam
    );

    @each $colour-name, $md-colour in $md-colour-list {
        .mdl-button.mdl-button--#{$colour-name} {
            color : rgb(63, 81, 181)
        }
        .mdl-button.mdl-button--#{$colour-name}:focus:not(:active) {
            background-color : $md-colour
        }
        .mdl-button--raised.mdl-button--#{$colour-name} {
            background : $md-colour;
            color      : rgb(255, 255, 255)
        }
        .mdl-button--raised.mdl-button--#{$colour-name}:hover {
            background-color : $md-colour
        }
        .mdl-button--raised.mdl-button--#{$colour-name}:active {
            background-color : $md-colour
        }
        .mdl-button--raised.mdl-button--#{$colour-name}:focus:not(:active) {
            background-color : $md-colour
        }
        .mdl-button--raised.mdl-button--#{$colour-name} .mdl-ripple {
            background : rgb(255, 255, 255)
        }
        .mdl-button--fab.mdl-button--#{$colour-name} {
            background : $md-colour;
            color      : rgb(255, 255, 255)
        }
        .mdl-button--fab.mdl-button--#{$colour-name}:hover {
            background-color : $md-colour
        }
        .mdl-button--fab.mdl-button--#{$colour-name}:focus:not(:active) {
            background-color : $md-colour
        }
        .mdl-button--fab.mdl-button--#{$colour-name}:active {
            background-color : $md-colour
        }
        .mdl-button--fab.mdl-button--#{$colour-name} .mdl-ripple {
            background : rgb(255, 255, 255)
        }
    }

    .mdl-button.mdl-button--social {
        padding-left : 52px;
        text-align   : left;
    }

    .icon {
        background-color : rgba(0, 0, 0, 0.2);
        width            : 40px;
        height           : 100%;
        position         : absolute;
        left             : 0;
        top              : 0;
        line-height      : 35px;
        text-align       : center;
    }
</style>

<script lang="babel">
    import MdlTab from "../components/mdl-tab.vue";
    import MdlTabPanel from "../components/mdl-tab-panel.vue";

    export default{
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
    }
</script>