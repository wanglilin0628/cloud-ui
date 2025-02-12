import { mount } from '@vue/test-utils'
import Button from '../index.vue'

describe('Button', () => {
  it('should call listener', async () => {
    const onClick = jest.fn()
    const wrapper = mount(Button, {
      listeners: { click: onClick }
    });
    await wrapper.find('a').trigger('click')
    expect(onClick).toHaveBeenCalledTimes(1)
  })
})
