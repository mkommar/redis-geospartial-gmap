<template>
    <nav class="vcu-list-pagination">
        <ul class="pagination">
            <li>
                <mdl-anchor-button v-mdl-ripple-effect v-link="getQuery(0) | qs" :disabled="isFirst">
                    <i class="material-icons">first_page</i>
                </mdl-anchor-button>
            </li>
            <li>
                <mdl-anchor-button v-mdl-ripple-effect v-link="getQuery(prev.offset) | qs" :disabled="isFirst">
                    <i class="material-icons">chevron_left</i>
                </mdl-anchor-button>
            </li>
            <li :class="{'active':isActive(page.index)}" v-for="page in pages" track-by="index">
                <mdl-anchor-button v-mdl-ripple-effect v-link="getQuery(page.offset) | qs"
                                   :disabled="isActive(page.index)"
                                   v-if="page.index>0">
                    {{page.index}}
                </mdl-anchor-button>
                <mdl-anchor-button disabled v-if="page.index<1">
                    <i class="material-icons">more_horiz</i>
                </mdl-anchor-button>
            </li>
            <li>
                <mdl-anchor-button v-mdl-ripple-effect v-link="getQuery(next.offset) | qs" :disabled="isLast">
                    <i class="material-icons">chevron_right</i>
                </mdl-anchor-button>
            </li>
            <li>
                <mdl-anchor-button v-mdl-ripple-effect v-link="getQuery(last.offset) | qs" :disabled="isLast">
                    <i class="material-icons">last_page</i>
                </mdl-anchor-button>
            </li>
        </ul>
    </nav>
</template>

<style lang="scss" scoped>
    @import "../styles/_exports";

    .pagination {
        padding-left : 0;
        li {
            display       : inline-block;
            font-size     : 1.2rem;
            line-height   : 30px;
            border-radius : 2px;
            text-align    : center;
            a {
                width     : 36px;
                color     : #444;
                min-width : initial;
                padding   : 0;
            }
            .material-icons {
                font-size      : 2.2rem;
                vertical-align : middle;
            }
            &.active {
                background-color : #4489fd;
                a {
                    color : white;
                }
            }
            &.disabled {
                a {
                    cursor         : default;
                    color          : #999;
                    pointer-events : none;
                }
            }
        }
    }
</style>

<script lang="babel">
    import _ from 'lodash';

    export default{
        props: {
            list: {},
            query: {}
        },
        computed: {
            pages() {
                let pages = [];
                if( this.total < 11 )
                {
                    pages = _.range( 0, this.total );
                }
                else if( this.current.index < 5 )
                {
                    pages = _.concat(
                            _.range( 0, 6 ),
                            -1,
                            this.total - 1
                    );
                }
                else if( this.total - this.current.index < 6 )
                {
                    pages = _.concat(
                            -1,
                            _.range( this.total - 7, this.total )
                    );
                }
                else
                {
                    pages = _.concat(
                            -1,
                            _.range( this.current.index - 3, this.current.index + 2 ),
                            -2,
                            this.total - 1
                    );
                }
                return _.map( pages, i =>({index: i + 1, offset: i * this.list.count}) );
            },
            current() {
                const index = Math.floor( this.total * (this.list.offset || 0) / this.list.total ) + 1;
                return {
                    index,
                    offset: (index - 1) * this.list.count
                };
            },
            prev() {
                return {
                    index: this.current.index - 1,
                    offset: this.current.index > 1 ? (this.current.index - 2) * this.list.count : 0
                };
            },
            next() {
                return {
                    index: this.current.index < this.total
                            ? this.current.index + 1
                            : this.total,
                    offset: this.current.index < this.total
                            ? this.current.index * this.list.count
                            : (this.total - 1) * this.list.count
                };
            },
            last() {
                return {
                    index: this.total - 1,
                    offset: (this.total - 1) * this.list.count
                };
            },
            total() {
                return Math.ceil( this.list.total / this.list.count );
            },
            isFirst(){
                return this.current.index === 1;
            },
            isLast(){
                return this.current.index === this.total;
            }
        },
        methods: {
            isActive( pageIndex ){
                return this.current.index === pageIndex;
            },
            getQuery( offset ){
                return _.assign( {}, {offset}, this.query );
            }
        }
    }
</script>