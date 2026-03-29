import { mount } from "@vue/test-utils";
import { createMemoryHistory, createRouter } from "vue-router";
import { defineComponent, nextTick } from "vue";

import App from "../App.vue";

const Home = defineComponent({
  template: "<div>Home Page</div>",
});

const Playground = defineComponent({
  template: "<div>Playground Page</div>",
});

describe("app router shell", () => {
  it("renders route navigation and switches pages", async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: "/", component: Home },
        { path: "/playground", component: Playground },
      ],
    });
    router.push("/");
    await router.isReady();

    const wrapper = mount(App, {
      global: {
        plugins: [router],
      },
    });

    expect(wrapper.text()).toContain("Desktop AI Assistant");
    expect(wrapper.text()).toContain("Home Page");

    await router.push("/playground");
    await nextTick();

    expect(wrapper.text()).toContain("Playground Page");
  });
});
