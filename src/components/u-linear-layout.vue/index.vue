<template>
<div :class="$style.root" :type="type" :direction="direction" v-on="$listeners" vusion-slot-name="default" :nowrap="!wrap" ref="root">
    <slot></slot>
    <template v-if="(!$slots.default) && $env.VUE_APP_DESIGNER && !!$attrs['vusion-node-path']">
        <div :class="$style.emptyTip" v-if="type === 'root'">拖拽右侧组件放至此处</div>
        <s-empty v-else></s-empty>
    </template>
    <div v-if="showLoading" :class="$style.mask">
        <u-loading
            :icon="loadingIcon"
            :text="loadingText"
            :icon-rotate="loadingIconRotate"
            :class="$style.loading">
        </u-loading>
    </div>
</div>
</template>

<script>
import SEmpty from '../s-empty.vue';
import ULoading from '../u-loading.vue';
import { throttle } from '../../utils/throttle';

export default {
    name: 'u-linear-layout',
    components: {
        SEmpty,
        ULoading,
    },
    props: {
        type: {
            type: String,
            default: '',
        },
        loadingIcon: {
            type: String,
            default: 'loading',
        },
        loadingIconRotate: {
            type: Boolean,
            default: true,
        },
        loadingText: {
            type: String,
            default: '',
        },
        direction: {
            default: 'horizontal',
            validator: (value) => ['horizontal', 'vertical'].includes(value),
        },
        wrap: {
            type: Boolean,
            default: true,
        },
    },
    data() {
        return {
            showLoading: false,
        };
    },
    mounted() {
        this.$refs.root.addEventListener('scroll', throttle(this.handleScroll.bind(this), 200));
    },
    methods: {
        openLoading() {
            this.showLoading = true;
        },
        closeLoading() {
            this.showLoading = false;
        },
        handleScroll(e) {
            const el = e.target;
            const { scrollHeight, scrollWidth, scrollTop, scrollLeft, clientHeight, clientWidth} = el;
            this.$emit('scroll', {
                scrollHeight,
                scrollWidth,
                scrollTop,
                scrollLeft,
                clientHeight,
                clientWidth,
            });
        },

    },
};
</script>

<style module>
.root[type="root"] {
    height: 100%;
    width: 100%;
    min-height: 200px;
    padding-bottom: 100px;
}

.root {
    position: relative;
}
/* 默认为 block */
.root[display="inline"], .root[inline] {
    display: inline-block;
}

/* @trap: 不能自动添加`display: block`了，因为`display`有好多种如`table``flex``grid`，有覆盖掉的风险。
 * 用一个属性来添加是否使用`block`
 */
.root[layout="block"] > * {
    display: block;
}
.root[layout="inline"] > * {
    display: inline-block;
}

.root[direction="horizontal"] > *:not(:last-child) {
    margin-right: var(--space-base);
}
.root[direction="vertical"] > *:not(:last-child) {
    margin-bottom: var(--space-base);
}

.root[direction="horizontal"][gap="shrink"] > *:not(:last-child) {
    margin-right: var(--space-shrink);
}
.root[direction="vertical"][gap="shrink"] > *:not(:last-child) {
    margin-bottom: var(--space-shrink);
}
.root[direction="horizontal"][gap="shrink"] > *:hover {
    position: relative;
}

.root[direction="horizontal"][gap="none"] > *:not(:last-child) {
    margin-right: 0;
}
.root[direction="vertical"][gap="none"] > *:not(:last-child) {
    margin-bottom: 0;
}

.root[direction="horizontal"][gap="mini"] > *:not(:last-child) {
    margin-right: var(--space-mini);
}
.root[direction="vertical"][gap="mini"] > *:not(:last-child) {
    margin-bottom: var(--space-mini);
}

.root[direction="horizontal"][gap="small"] > *:not(:last-child) {
    margin-right: var(--space-small);
}
.root[direction="vertical"][gap="small"] > *:not(:last-child) {
    margin-bottom: var(--space-small);
}

.root[direction="horizontal"][gap="large"] > *:not(:last-child) {
    margin-right: var(--space-large);
}
.root[direction="vertical"][gap="large"] > *:not(:last-child) {
    margin-bottom: var(--space-large);
}

/* @deprecated */
.root[alignment="left"] { text-align: left; }
.root[alignment="center"] { text-align: center; }
.root[alignment="right"] { text-align: right; }

/* @TRAP: 使用 text-align 可能会造成使用子元素的默认对齐方式不是左对齐 */
.root[justify="start"] { text-align: left; }
.root[justify="center"] { text-align: center; }
.root[justify="end"] { text-align: right; }
.root[justify="space-between"] > *:first-child { float: left; }
.root[justify="space-between"] > *:last-child { float: right; }
/* stylelint-disable-next-line declaration-block-single-line-max-declarations */
.root[justify="space-between"]::after { display: block; content: ''; clear: both; }

.root[type="flex"] { display: flex; text-align: inherit; }

.root[type="flex"][direction="vertical"] { flex-direction: column; }

.root[type="flex"][justify="start"] { justify-content: flex-start; }
.root[type="flex"][justify="center"] { justify-content: center; }
.root[type="flex"][justify="end"] { justify-content: flex-end; }
.root[type="flex"][justify="space-between"] { justify-content: space-between; }
.root[type="flex"][justify="space-between"]::after { display: none; }
.root[type="flex"][justify="space-around"] { justify-content: space-around; }

.root[type="flex"][alignment="start"] { align-items: flex-start; }
.root[type="flex"][alignment="center"] { align-items: center; }
.root[type="flex"][alignment="end"] { align-items: flex-end; }
.root[type="flex"][alignment="baseline"] { align-items: baseline; }
.root[type="flex"][alignment="stretch"] { align-items: stretch; }

.root[mode="inline"] {
    display: inline-block;
}
.root[mode="block"] {
    display: block;
}

.root[mode="flex"] { display: flex; text-align: inherit; flex-wrap: wrap; }
.root[mode="flex"][nowrap] {flex-wrap: nowrap;}
/* 与主轴同向用 flex，否则用 align-self */
.root[mode="flex"][direction="horizontal"] > [width-stretch="true"],
.root[mode="flex"][direction="horizontal"] > [widthstretch="true"],
.root[mode="flex"]:not([direction]) > [width-stretch="true"],
.root[mode="flex"]:not([direction]) > [widthstretch="true"],
.root[mode="flex"][direction="vertical"] > [height-stretch="true"],
.root[mode="flex"][direction="vertical"] > [heightstretch="true"] { flex: 1 0 0; }
.root[mode="flex"][direction="vertical"] > [width-stretch="true"],
.root[mode="flex"][direction="vertical"] > [widthstretch="true"],
.root[mode="flex"]:not([direction]) > [height-stretch="true"],
.root[mode="flex"]:not([direction]) > [heightstretch="true"],
.root[mode="flex"][direction="horizontal"] > [height-stretch="true"],
.root[mode="flex"][direction="horizontal"] > [heightstretch="true"] { align-self: stretch; }
/* width-stretch 强制 width 为 unset */
.root[mode="flex"] > [width-stretch="true"],
.root[mode="flex"] > [widthstretch="true"] { width: unset !important; }
/* height-stretch 强制 height 为 unset */
.root[mode="flex"] > [height-stretch="true"],
.root[mode="flex"] > [heightstretch="true"] { height: unset !important; }

.root[mode="flex"][direction="vertical"] { flex-direction: column; }

.root[mode="flex"][justify="start"] { justify-content: flex-start; }
.root[mode="flex"][justify="center"] { justify-content: center; }
.root[mode="flex"][justify="end"] { justify-content: flex-end; }
.root[mode="flex"][justify="space-between"] { justify-content: space-between; }
.root[mode="flex"][justify="space-between"]::after { display: none; }
.root[mode="flex"][justify="space-around"] { justify-content: space-around; }

.root[mode="flex"][alignment="start"] { align-items: flex-start; align-content: flex-start; }
.root[mode="flex"][alignment="center"] { align-items: center; align-content: center; }
.root[mode="flex"][alignment="end"] { align-items: flex-end; align-content: flex-end; }
.root[mode="flex"][alignment="baseline"] { align-items: baseline; align-content: baseline; }
.root[mode="flex"][alignment="stretch"] { align-items: stretch; align-content: stretch; }

.emptyTip {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
    color: #666666;
}

.mask {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    background: var(--linear-layout-background);
}

.loading {
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%, -50%);
}
</style>
