<script lang="ts">
import { defineComponent, h, TransitionGroup } from 'vue'

// Render through Vue on both sides so optional tags and slot fragments hydrate identically.
export default defineComponent({
  inheritAttrs: false,
  props: { tag: String, appear: Boolean },
  setup(props, { attrs, slots }) {
    return () =>
      h(
        TransitionGroup,
        {
          ...attrs,
          name: 'motion-list',
          appear: props.appear,
          ...(props.tag ? { tag: props.tag } : {}),
        },
        slots,
      )
  },
})
</script>
