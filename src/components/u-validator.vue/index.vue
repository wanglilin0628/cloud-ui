<template>
<div :class="$style.root" vusion-slot-name="default" :display="display">
    <slot></slot>
    <template v-if="appendTo === 'body'">
         <m-popper ref="popper" append-to="body" disabled-close trigger="manual" :opened="showMessage">
            <span ref="message" v-show="showMessage" :class="[$style.message, $style.messagepop]" color="error" :display="display">{{ message || firstError }}</span>
        </m-popper>
    </template>
    <template v-else>
        <span ref="message" v-show="!mutedMessage && touched && !valid && firstError && !(blurred && blurReset)" :class="$style.message" color="error">{{ message ||firstError }}</span>
    </template>
    <s-empty v-if="(!$slots.default) && $env.VUE_APP_DESIGNER && !!$attrs['vusion-node-path']"></s-empty>
</div>
</template>

<script>
import MEmitter from '../m-emitter.vue';
import VusionValidator from '@vusion/validator';
import VueVusionValidator from '@vusion/validator/VuePlugin';
import debounce from 'lodash/debounce';
import SEmpty from '../../components/s-empty.vue';

export default {
    name: 'u-validator',
    isValidator: true,
    components: { SEmpty },
    install(Vue) {
        Vue.use(VueVusionValidator, { locale: Vue.i18n && Vue.i18n.locale });
    },
    mixins: [MEmitter],
    props: {
        name: String,
        label: String,
        action: String,
        rules: [String, Array, Object], // target: { type: String, default: 'auto' }, // 暂不开放此属性
        message: String,
        muted: String,
        blurReset: { type: Boolean, default: false },
        ignoreRules: { type: Boolean, default: false }, // @deprecated
        ignoreValidation: { type: Boolean, default: false },
        validatingOptions: Object,
        validatingValue: null,
        validatingProcess: { type: Function, default: (value) => value },
        manual: { type: Boolean, default: false },
        widthReferenceEle: { type: HTMLElement, default: null },
        appendTo: {
            type: String,
            default: 'reference',
            validator: (value) => ['body', 'reference'].includes(value),
        },
        display: String,
    },
    data() {
        return {
            value: undefined,
            oldValue: undefined,
            inputing: false,
            pending: false, // touched: false,
            // dirty: false,
            // valid: false,
            fieldTouched: false,
            realValid: false,
            triggerValid: false,
            blurred: false,
            validatorVMs: [],
            fieldVM: undefined,
            parentVM: undefined,
            rootVM: undefined,
            hasUpdateEvent: false, // @compat
            state: '',
            color: '',
            currentMessage: this.message,
            firstErrorMessage: '',
            validator: undefined,
        };
    },
    computed: {
        currentRules() {
            return (this.rules || (this.rootVM && this.rootVM.rules && this.rootVM.rules[this.name]));
        },
        currentTarget() {
            // if (this.target === 'auto')
            return this.validatorVMs.length ? 'validatorVMs' : 'fieldVM'; // else
            //     return this.target;
        },
        touched() {
            if (this.currentTarget === 'validatorVMs')
                return this.validatorVMs.some((validatorVM) => validatorVM.touched);
            else
                return this.fieldTouched;
        },
        dirty() {
            if (this.currentTarget === 'validatorVMs')
                return this.validatorVMs.some((validatorVM) => validatorVM.dirty);
            else
                return this.value !== this.oldValue;
        },
        valid() {
            if (this.currentTarget === 'validatorVMs')
                return this.validatorVMs.every((validatorVM) => validatorVM.valid);
            else
                return this.realValid;
        },
        firstError() {
            if (this.currentTarget === 'validatorVMs') {
                const validatorVM = this.validatorVMs.find((validatorVM) => validatorVM.touched && validatorVM.firstError);
                return validatorVM ? validatorVM.firstError : undefined;
            } else
                return this.fieldTouched && this.firstErrorMessage;
        },
        mutedMessage() {
            return this.muted === 'all' || this.muted === 'message';
        },
        showMessage() {
            return !this.mutedMessage && this.touched && !this.valid && this.firstError && !(this.blurred && this.blurReset);
        },
    },
    watch: {
        currentRules() {
            const context = this.$vnode.context;
            this.validator = new VusionValidator(
                context.$options.validators,
                context.$options.rules,
                this.currentRules,
                context,
            );
            this.validate('submit', !this.touched);
        },
        valid(newValue) {
            if (!newValue) {
                if (this.widthReferenceEle) {
                    const refEleLeft = this.widthReferenceEle.getBoundingClientRect().left;
                    const msgEleLeft = this.$refs.message.parentNode.getBoundingClientRect().left;
                    const leftPos = msgEleLeft - refEleLeft;
                    const msgWidth = window.getComputedStyle(this.widthReferenceEle).getPropertyValue('width');
                    this.$refs.message.style.width = (+msgWidth.substring(0, msgWidth.length - 2) - 32) + 'px';
                    this.$refs.message.style.left = '-' + (leftPos - 16) + 'px';
                    this.$refs.message.style.right = '16px';
                }
            }
        },
        appendTo() {
            this.setIntersectionObserver();
        },
    },
    created() {
        const context = this.$vnode.context;
        this.validator = new VusionValidator(
            context.$options.validators,
            context.$options.rules,
            this.currentRules,
            context,
        ); // this.debouncedValidate = debounce(this.validate, 50, { leading: false, trailing: true });
        this.debouncedOnValidate = debounce(this.onValidate, 50, {
            leading: true,
            trailing: true,
        });
        this.$on('add-validator-vm', (validatorVM) => {
            validatorVM.rootVM = this.rootVM;
            validatorVM.parentVM = this;
            this.validatorVMs.push(validatorVM);
        });
        this.$on('remove-validator-vm', (validatorVM) => {
            validatorVM.rootVM = undefined;
            validatorVM.parentVM = undefined;
            this.validatorVMs.splice(this.validatorVMs.indexOf(validatorVM), 1);
        });
        if (this.$options.name !== 'u-form')
            this.$dispatch(($parent) => $parent.$options.isValidator || $parent.$options.isField, 'add-validator-vm', this);
        if (!this.parentVM || this.$options.name === 'u-form')
            this.rootVM = this;
        this.triggerValid = this.realValid = !(this.currentRules && this.currentRules.length);
        this.$on('add-field-vm', (fieldVM) => {
            const addField = (vm) => {
                this.fieldVM = vm;
                vm.validatorVM = this;
                vm.formItemVM = this; // @compat
                this.fieldTouched = false;
                this.blurred = false;
                this.value = vm.value; // 初始化的时候自行验证一次。Fix #23
                this.validate('submit', true);
            }; // @TODO: 一个`<u-form-item>`中，只注册一个`fieldVM`，其他的忽略
            if (!this.fieldVM)
                addField(fieldVM);
            // remove 之后再添加的情况
            else
                this.$nextTick(() => !this.fieldVM && addField(fieldVM));
        });
        this.$on('remove-field-vm', (fieldVM) => {
            this.fieldVM = undefined;
            fieldVM.validatorVM = undefined;
            fieldVM.formItemVM = undefined; // @compat
        });
        this.$on('update', this.onUpdate);
        this.$on('input', this.onInput);
        this.$on('change', this.onChange);
        this.$on('focus', this.onFocus);
        this.$on('blur', this.onBlur);
    },
    mounted() {
        this.setIntersectionObserver();
    },
    destroyed() {
        this.$dispatch(($parent) => $parent.$options.isValidator, 'remove-validator-vm', this);
        this.destroyIntersectionObserver();
    },
    methods: {
        onUpdate(value) {
            if (this.currentTarget === 'validatorVMs' || this.manual)
                return;
            this.hasUpdateEvent = true;
            this.value = value;
            // 在没有触碰前，走 @update 事件；在触碰后，走 @input 事件；已经 blur 后可以触发
            if (!this.fieldTouched || this.blurred) {
                this.oldValue = value;
                this.$nextTick(() => this.validate('submit', !this.blurred));
            }
        },
        onInput(value) {
            if (this.currentTarget === 'validatorVMs' || this.manual)
                return;
            if (!this.fieldTouched)
                this.fieldTouched = true;
            this.inputing = true;
            this.value = value; // 处理输入法输入的问题
            this.$nextTick(() => {
                this.validate('input');
                this.inputing = false;
            });
        },
        onChange($event) {
            if (this.currentTarget === 'validatorVMs' || this.manual)
                return;
            if (!this.fieldTouched)
                this.oldValue = $event.value;
            this.value = $event.value; // @compat: 以后推荐使用 @update & @input 事件
            if (!this.hasUpdateEvent && !this.inputing)
                this.validate('submit', true);
        },
        onFocus() {
            if (this.currentTarget === 'validatorVMs')
                return;
            this.color = 'focus';
            this.blurred = false;
            this.oldValue = this.value;
            this.currentMessage = this.message;
        },
        errorCheck() {
            return !this.mutedMessage && this.touched && !this.valid && this.firstError;
        },
        onBlur($event) {
            this.blurred = true;
            if (this.blurReset) {
                if (this.errorCheck()) {
                    this.fieldVM.currentValue = this.oldValue;
                }
            }
            if (this.currentTarget === 'validatorVMs' || this.manual)
                return;
            if (!this.fieldTouched)
                this.fieldTouched = true;
            this.color = this.state = '';
            this.$nextTick(() => this.validate('blur'));
        },
        validate(trigger = 'submit', untouched = false) {
            if (this.currentTarget === 'validatorVMs') {
                return Promise.all(this.validatorVMs.map((validatorVM) => validatorVM.validate('submit', untouched)))
                    .then((results) => this.get$event(trigger));
            } else {
                this.triggerValid = true;
                this.realValid = true;
                if (this.ignoreRules || this.ignoreValidation) {
                    this.firstErrorMessage = this.currentMessage = '';
                    this.color = '';
                    return Promise.resolve(this.onValidate(trigger));
                }
                this.pending = true;
                this.state = 'validating';
                if (!untouched)
                    this.fieldTouched = true;
                if (
                    untouched
                    || this.muted === 'all'
                    || this.muted === 'color'
                )
                    this.color = this.currentMessage = '';
                else
                    this.color = this.state;
                if (trigger === 'submit')
                    trigger = '';
                const value = this.validatingProcess(this.validatingValue === undefined ? this.value : this.validatingValue);

                // @TODO: 临时解决一下，用 blur 当 change
                const INPUT_NAMES = ['u-input', 'u-textarea', 'u-number-input', 'u-time-picker'];
                if (trigger === 'input' && !INPUT_NAMES.includes(this.fieldVM.$options.name)) {
                    trigger = 'blur';
                }

                return this.validator.validate(value, trigger, Object.assign({
                    label: this.label || '字段',
                    action: this.action || '输入',
                }, this.validatingOptions)).then(() => {
                    this.pending = false;
                    this.triggerValid = true;
                    this.realValid = this.triggerValid;
                    this.state = 'success';
                    this.firstErrorMessage = '';
                    if (!untouched && this.muted !== 'all' && this.muted !== 'color')
                        this.color = this.state;
                    if (!untouched && this.muted !== 'all' && this.muted !== 'message')
                        this.currentMessage = this.message;
                    return this.onValidate(trigger);
                }).catch((error) => {
                    this.pending = false;
                    this.triggerValid = false;
                    this.realValid = this.triggerValid;
                    this.state = 'error';
                    this.firstErrorMessage = error;
                    if (!untouched && this.muted !== 'all' && this.muted !== 'color')
                        this.color = this.state;
                    if (!untouched && this.muted !== 'all' && this.muted !== 'message')
                        this.currentMessage = error;
                    return this.onValidate(trigger);
                });
            }
        },
        get$event(trigger) {
            const $event = {
                trigger,
                valid: this.valid,
                triggerValid: this.triggerValid,
                touched: this.touched,
                dirty: this.dirty,
                firstError: this.firstError,
                update: () => this.oldValue = this.value,
            };
            if (this.currentTarget === 'fieldVM') {
                $event.value = this.value;
                $event.oldValue = this.oldValue;
            }

            return $event;
        },
        onValidate(trigger) {
            const $event = this.get$event(trigger);
            this.$emit('validate', $event, this);
            if ($event.touched) {
                if ($event.trigger === 'blur') {
                    if ($event.dirty) {
                        if ($event.valid)
                            this.$emit('blur-dirty-valid', $event, this);
                        else
                            this.$emit('blur-dirty-invalid', $event, this);
                    }
                    if ($event.valid)
                        this.$emit('blur-valid', $event, this);
                    else
                        this.$emit('blur-invalid', $event, this);
                } else if ($event.trigger === 'input') {
                    if ($event.dirty) {
                        if ($event.valid)
                            this.$emit('input-dirty-valid', $event, this);
                        else
                            this.$emit('input-dirty-invalid', $event, this);
                    }
                    if ($event.valid)
                        this.$emit('input-valid', $event, this);
                    else
                        this.$emit('input-invalid', $event, this);
                } else if ($event.trigger === 'submit') {
                    if ($event.dirty) {
                        if ($event.valid)
                            this.$emit('submit-dirty-valid', $event, this);
                        else
                            this.$emit('submit-dirty-invalid', $event, this);
                    }
                    if ($event.valid)
                        this.$emit('submit-valid', $event, this);
                    else
                        this.$emit('submit-invalid', $event, this);
                }
            }
            this.parentVM && this.parentVM.debouncedOnValidate(trigger);
            return $event;
        },
        updatePopper() {
            if (this.$refs.popper) {
                this.$refs.popper.update();
            }
        },
        /**
         * 当父级dispaly:none时，popper没有重新计算会留在原来的位置
         * 增加监听，变化后重新计算
         * MutationObserver只能监听父级元素，避免父级元素设置过大，增加IntersectionObserver监听
         * IntersectionObserver，本身或者父级有设置dispaly:none的时候可以触发
         * MutationObserver父级子元素有变化的时候
         */
        createIntersectionObserver() {
            // 本身或者父级有设置dispaly:none的情况
            this.iObserver = new IntersectionObserver(() => {
                this.updatePopper();
            }, {
                root: null,
                rootMargin: '0px',
                threshold: 1.0,
            });
            if (this.iObserver) {
                this.iObserver.observe(this.$el);
            }
            // 本身的前面组件有增删、dispaly:none的情况
            this.mObserver = new MutationObserver(() => {
                this.updatePopper();
            });
            if (this.mObserver) {
                this.mObserver.observe(this.$el.parentElement, {
                    childList: true,
                    subtree: true,
                    attributeFilter: ['style'],
                });
            }
        },
        destroyIntersectionObserver() {
            if (this.iObserver) {
                this.iObserver.disconnect();
                this.iObserver = null;
            }
            if (this.mObserver) {
                this.mObserver.disconnect();
                this.mObserver = null;
            }
        },
        setIntersectionObserver() {
            if (this.appendTo === 'body') {
                this.createIntersectionObserver();
            } else {
                this.destroyIntersectionObserver();
            }
        },
    },
};
</script>

<style module src="./index.css"></style>
