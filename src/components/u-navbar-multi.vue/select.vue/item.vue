<script>
import { USelectItem } from '../../u-select.vue';

export default {
    name: 'u-navbar-select-item-multi',
    parentName: 'u-navbar-select-multi',
    groupName: 'u-navbar-select-group-multi',
    extends: USelectItem,
};
</script>

<style module>
@extends '../../u-select.vue/item.css';

.root {
    padding: var(--navbar-select-item-padding);
    color: var(--navbar-select-item-color);
}

.root:hover {
    background: var(--navbar-select-item-background-hover);
}

.root[focused] {
    background: var(--navbar-select-item-background-hover);

}
</style>
