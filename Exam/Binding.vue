<!-- BindingShowcase.vue -->
<script setup lang="ts">
import { computed, reactive, ref } from 'vue'

/**
 * Think MVVM:
 * - Model/state = the reactive values below (ref/reactive)
 * - View = the <template>
 * - ViewModel = the glue: computed + methods that the template binds to
 * When state changes, Vue re-renders automatically. :contentReference[oaicite:1]{index=1}
 */

// ---------------------------
// 1) Reactive state (Model)
// ---------------------------
const name = ref('Ada')
const salary = ref(1000)
const agreed = ref(false)
const selectedRole = ref<'Student' | 'TA' | 'Teacher'>('Student')

const ui = reactive({
  imgUrl: 'https://picsum.photos/seed/vue/120/80',
  altText: 'Random image',
  disabled: false,
})

// ---------------------------
// 2) Computed (derived state)
// ---------------------------
/**
 * A computed can be used like a normal value in the template.
 * With get+set, it can also participate in v-model (two-way) safely.
 */
const salaryText = computed({
  get: () => String(salary.value),
  set: (v: string) => {
    // Example: keep state consistent by parsing input
    const n = Number(v)
    salary.value = Number.isFinite(n) ? n : 0
  },
})

const greeting = computed(() => `Hello, ${name.value}!`)
const canSubmit = computed(() => agreed.value && salary.value > 0 && !ui.disabled)

// ---------------------------
// 3) Methods (event handlers)
// ---------------------------
function randomizeName() {
  const names = ['Ada', 'Linus', 'Grace', 'Edsger', 'Margaret']
  name.value = names[Math.floor(Math.random() * names.length)]
}

function toggleDisabled() {
  ui.disabled = !ui.disabled
}

function incrementSalary() {
  salary.value += 100
}

function submit() {
  alert(
    JSON.stringify(
      { name: name.value, salary: salary.value, agreed: agreed.value, role: selectedRole.value },
      null,
      2
    )
  )
}
</script>

<template>
  <section style="font-family: system-ui; max-width: 820px; line-height: 1.4">
    <h2>Vue binding showcase</h2>

    <!-- ========================================= -->
    <!-- A) 1-way text binding: {{ interpolation }} -->
    <!-- ========================================= -->
    <p>
      <!-- {{ }} reads a value from the ViewModel and renders it as text -->
      Interpolation: <strong>{{ greeting }}</strong>
    </p>

    <!-- ================================================ -->
    <!-- B) 1-way attribute binding: :attr / v-bind:attr   -->
    <!-- ================================================ -->
    <div style="display: flex; gap: 12px; align-items: center">
      <!-- :src and :alt bind DOM attributes to reactive values -->
      <img :src="ui.imgUrl" :alt="ui.altText" width="120" height="80" />

      <div>
        <div>
          <!-- You can bind *any* attribute/prop: here title + disabled -->
          <button
            :title="ui.disabled ? 'Currently disabled' : 'Click to randomize name'"
            :disabled="ui.disabled"
            @click="randomizeName"
          >
            @click event + :disabled + :title
          </button>
        </div>

        <small>
          <!-- Another interpolation showing current state -->
          disabled = {{ ui.disabled }}
        </small>
      </div>
    </div>

    <hr />

    <!-- ========================================= -->
    <!-- C) Event binding: @event / v-on:event      -->
    <!-- ========================================= -->
    <p>
      <!-- @click binds a DOM event to a method in the ViewModel -->
      <button @click="toggleDisabled">Toggle disabled</button>
      <button @click="incrementSalary" :disabled="ui.disabled">+100 salary</button>
    </p>

    <!-- ========================================= -->
    <!-- D) 2-way binding: v-model                  -->
    <!-- ========================================= -->
    <h3>v-model examples</h3>

    <div style="display: grid; gap: 10px; grid-template-columns: 200px 1fr; align-items: center">
      <!-- v-model keeps input.value <-> state in sync (two-way) -->
      <label for="name">Name (v-model)</label>
      <input id="name" v-model="name" :disabled="ui.disabled" />

      <!-- v-model on number input + .number modifier -->
      <label for="salary">Salary (v-model.number)</label>
      <input
        id="salary"
        type="number"
        v-model.number="salary"
        :disabled="ui.disabled"
        min="0"
      />

      <!-- v-model on checkbox (boolean) -->
      <label for="agree">Agree? (checkbox)</label>
      <input id="agree" type="checkbox" v-model="agreed" :disabled="ui.disabled" />

      <!-- v-model on select -->
      <label for="role">Role (select)</label>
      <select id="role" v-model="selectedRole" :disabled="ui.disabled">
        <option>Student</option>
        <option>TA</option>
        <option>Teacher</option>
      </select>
    </div>

    <p>
      <!-- Show that v-model updated state -->
      Current state:
      <code>{{ { name, salary, agreed, selectedRole } }}</code>
    </p>

    <hr />

    <!-- ==================================================== -->
    <!-- E) v-model with computed (get+set)                    -->
    <!-- ==================================================== -->
    <h3>Computed + v-model (get/set)</h3>
    <p style="margin-top: 0">
      This input uses <code>v-model="salaryText"</code> (a computed with get+set),
      and the computed updates <code>salary</code>.
    </p>
    <input v-model="salaryText" :disabled="ui.disabled" />
    <div>salary (number) is now: <strong>{{ salary }}</strong></div>

    <hr />

    <!-- ==================================================== -->
    <!-- F) Binding working together: class + style bindings   -->
    <!-- ==================================================== -->
    <h3>Bindings working together</h3>

    <div
      :class="{
        box: true,
        ok: canSubmit,
        bad: !canSubmit
      }"
      :style="{
        padding: '10px',
        borderRadius: '8px',
        border: '1px solid #ccc'
      }"
    >
      <!-- conditional rendering result is still just state -> UI -->
      <p style="margin: 0 0 8px">
        canSubmit = <strong>{{ canSubmit }}</strong>
      </p>

      <!-- submit button uses :disabled (1-way) and @click (event) -->
      <button :disabled="!canSubmit" @click="submit">
        Submit (enabled only when agreed && salary > 0 && not disabled)
      </button>
    </div>

    <!-- quick inline style so you can see class binding effect -->
    <style scoped>
    .box { transition: 0.2s; }
    .ok { background: #eefbf1; }
    .bad { background: #fff4f4; }
    </style>
  </section>
</template>
