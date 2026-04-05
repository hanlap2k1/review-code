export const CODE_SAMPLE = `
  --- a/src/component/Query/FilterBuilder.vue
+++ b/src/component/Query/FilterBuilder.vue
@@ -261,7 +261,8 @@
           <PlusCircle class="w-4 h-4" /> Thêm lọc
         </button>
         <p class="text-slate-500 text-xs hidden lg:block">
-          Ấn <span class="border rounded-md p-1">Shift</span> +
+          Ấn <span class="border rounded-md p-1">Ctrl</span> +
+          <span class="border rounded-md p-1">Shift</span> +
           <span class="border rounded-md p-1">F</span> để mở hoặc đóng
         </p>
       </div>
@@ -394,7 +395,7 @@ const is_check_default = computed(() => {
   )
 })

-const { shift_f } = useMagicKeys()
+const { ctrl_shift_f } = useMagicKeys()
 const { getSelectedValue, isDifferent, hasValue, isDifferentValue } =
   useQueryBuilder()
:...skipping...
commit d25a26864a1f54c1a7ea7416a90e74e230a9ffcc (HEAD -> merge/main_improve-config-v2, origin/merge/main_improve-config-v2)
Author: bbhhainx <hainx.bbh@gmail.com>
Date:   Wed Apr 1 14:39:23 2026 +0700

    feat: implement report view component architecture with filter, sort, and chart configuration modules

diff --git a/src/component/Query/FilterBuilder.vue b/src/component/Query/FilterBuilder.vue
index 0273935..acac899 100644
--- a/src/component/Query/FilterBuilder.vue
+++ b/src/component/Query/FilterBuilder.vue
@@ -261,7 +261,8 @@
           <PlusCircle class="w-4 h-4" /> Thêm lọc
         </button>
         <p class="text-slate-500 text-xs hidden lg:block">
-          Ấn <span class="border rounded-md p-1">Shift</span> +
+          Ấn <span class="border rounded-md p-1">Ctrl</span> +
+          <span class="border rounded-md p-1">Shift</span> +
           <span class="border rounded-md p-1">F</span> để mở hoặc đóng
         </p>
       </div>
@@ -394,7 +395,7 @@ const is_check_default = computed(() => {
   )
 })

-const { shift_f } = useMagicKeys()
+const { ctrl_shift_f } = useMagicKeys()
 const { getSelectedValue, isDifferent, hasValue, isDifferentValue } =
   useQueryBuilder()
 /** sử dụng composable để nhóm các field theo type */
@@ -447,7 +448,7 @@ watch(
 )

 // nhấn shift + f thì toggle bộ lọc
-watch(shift_f, (v) => {
+watch(ctrl_shift_f, (v) => {
   if (v) is_open.value = !is_open.value
 })

@@ -671,10 +672,12 @@ function handleSaveFilter() {
 function getConditionByField(field_name?: string) {
   // nếu chưa chọn field thì thôi
   if (!field_name) return []
-  /** loại dữ liệu của field */
-  const TYPE = $props.fields[field_name].type
+  /** dữ liệu field đang chọn */
+  const FIELD = $props.fields[field_name]
+  // nếu không có field tương ứng thì thôi
+  if (!FIELD) return []
   // danh sách option condition theo type
-  return CONDITION[TYPE]
+  return CONDITION[FIELD.type]
 }

 /** hàm xử lý cập nhật app id  */
diff --git a/src/component/Query/SortBuilder.vue b/src/component/Query/SortBuilder.vue
index b74f211..22eec88 100644
--- a/src/component/Query/SortBuilder.vue
+++ b/src/component/Query/SortBuilder.vue
@@ -132,7 +132,9 @@
           <PlusCircle class="w-4 h-4" /> Thêm sắp xếp
         </button>
         <p class="text-slate-500 text-xs hidden lg:block">
-          Ấn <span class="border rounded-md p-1">Shift</span> +
+          Ấn
+          <span class="border rounded-md p-1">Ctrl</span> +
+          <span class="border rounded-md p-1">Shift</span> +
           <span class="border rounded-md p-1">S</span> để mở hoặc đóng
         </p>
       </div>
@@ -243,7 +245,7 @@ const is_default_value = computed(() => {
   return isDifferentSortBuilder(sort_builder_value.value, getDefaultSort())
 })

-const { shift_s } = useMagicKeys()
+const { ctrl_shift_s } = useMagicKeys()

 const { isDifferentSortBuilder } = useSortBuilder()

@@ -273,7 +275,7 @@ useMountedWatch(
 )

 // nhấn shift + f thì toggle bộ lọc
-watch(shift_s, (v) => {
+watch(ctrl_shift_s, (v) => {
   if (v) is_open.value = !is_open.value
 })

diff --git a/src/component/ReportView/components/chart/ChartConfig.vue b/src/component/ReportView/components/chart/ChartConfig.vue
index 91fbb2e..3cdf360 100644
--- a/src/component/ReportView/components/chart/ChartConfig.vue
+++ b/src/component/ReportView/components/chart/ChartConfig.vue
@@ -582,6 +582,8 @@ const options_y = computed<
 >(() => {
   /** danh sách các field */
   const FIELDS = cloneDeep($props.fields)
+  /** các field có thể chọn y-asis */
+  const FIELD_DATA = ['number', 'duration']

   // map các trường dữ liệu sẽ bị loại bỏ ở y-asis
   if ($props.chart_options?.exclude_y?.length) {
@@ -591,8 +593,8 @@ const options_y = computed<
   }

   /** các trường dữ liệu có type là number */
-  const NUMBER_FIELDS = Object.keys(FIELDS)?.filter(
-    (field) => FIELDS?.[field]?.type === 'number',
+  const NUMBER_FIELDS = Object.keys(FIELDS)?.filter((field) =>
+    FIELD_DATA.includes(FIELDS?.[field]?.type),
   )

   /** danh sách y từ config */
diff --git a/src/component/ReportView/components/chart/ChartConfig/Layout/FormatAndVisible.vue b/src/component/ReportView/components/chart/ChartConfig/Layout/FormatAndVisible.vue
index 862149c..76e5011 100644
--- a/src/component/ReportView/components/chart/ChartConfig/Layout/FormatAndVisible.vue
+++ b/src/component/ReportView/components/chart/ChartConfig/Layout/FormatAndVisible.vue
@@ -6,17 +6,27 @@
       <p class="w-12 text-center">Hiển thị</p>
     </div>
     <ul class="flex flex-col gap-1 max-h-[50dvh] overflow-auto">
-      <li v-if="['line', 'bar'].includes(setting.type)"
-        class="flex gap-2 items-center p-1 hover:bg-muted rounded-md group">
+      <li
+        v-if="['line', 'bar'].includes(setting.type)"
+        class="flex gap-2 items-center p-1 hover:bg-muted rounded-md group"
+      >
         <p class="w-full truncate">Giá trị trục tung</p>
         <div class="w-24 shrink-0">
-          <Dropdown :model-value="setting.setting.y_format?.format" @update:model-value="
-            ($event) =>
-              updateYFormat({
-                ...(setting.setting.y_format || {}),
-                format: $event,
-              })
-          " :datas="NUMBER_FORMAT_OPTION" class_trigger="w-full" value="value" label="label" placeholder="Định dạng">
+          <Dropdown
+            :model-value="setting.setting.y_format?.format"
+            :datas="getYAxisFormatOptions()"
+            class_trigger="w-full"
+            value="value"
+            label="label"
+            placeholder="Định dạng"
+            @update:model-value="
+              ($event) =>
+                updateYFormat({
+                  ...(setting.setting.y_format || {}),
+                  format: $event,
+                })
+            "
+          >
             <template #item="{ item }">
               <div class="flex justify-between w-full gap-3">
                 <p>{{ item?.label }}</p>
@@ -29,8 +39,10 @@
         </div>
         <div class="w-12 shrink-0"></div>
       </li>
-      <li v-for="(item, index) in show_items"
-        class="flex gap-2 items-center p-1 hover:bg-muted rounded-md group">
+      <li
+        v-for="(item, index) in show_items"
+        class="flex gap-2 items-center p-1 hover:bg-muted rounded-md group"
+      >
         <p class="w-full truncate">
           {{
             getLabel({
@@ -41,9 +53,15 @@
           }}
         </p>
         <div class="w-24 shrink-0">
-          <Dropdown :model-value="item.format" @update:model-value="($event) => updateFormat($event, index)"
+          <Dropdown
+            :model-value="item.format"
             :datas="getOptions(item)"
-            class_trigger="w-full" value="value" label="label" placeholder="Định dạng">
+            class_trigger="w-full"
+            value="value"
+            label="label"
+            placeholder="Định dạng"
+            @update:model-value="($event) => updateFormat($event, index)"
+          >
             <template #item="{ item }">
               <div class="flex justify-between w-full gap-3">
                 <p>{{ item?.label }}</p>
@@ -55,8 +73,11 @@
           </Dropdown>
         </div>
         <div class="w-12 flex items-center shrink-0 justify-center">
-          <Toggle v-model="item.visible" custom_class="peer-checked:!bg-black !w-7 !h-4 after:!w-3 after:!h-3"
-            @update:model-value="updateVisible" />
+          <Toggle
+            v-model="item.visible"
+            custom_class="peer-checked:!bg-black !w-7 !h-4 after:!w-3 after:!h-3"
+            @update:model-value="updateVisible"
+          />
         </div>
       </li>
     </ul>
@@ -70,7 +91,6 @@ import { cloneDeep } from 'lodash'
 import { nextTick, ref, watch } from 'vue'

 import Toggle from '@/components/Toggle.vue'
-
 import Dropdown from '@/component/shared/Dropdown.vue'

 import type {
@@ -90,15 +110,19 @@ const $props = defineProps<{
   chart_options: ChartConfigOption
   /** hàm cập nhật danh sách các mảng dữ liệu hiển thị của biểu đồ */
   updateItems: (item: ValueItemInfo[]) => void
-  /** hàm câp nhật dữ liệu giao diện của đơn vị trục tung */
+  /** hàm cập nhật dữ liệu giao diện của đơn vị trục tung */
   updateYFormat: (data: LabelItemInfo) => void
 }>()

 /** danh sách các dữ liệu hiển thị được lọc với search */
 const show_items = ref<ValueItemInfo[]>([])

-const { NUMBER_FORMAT_OPTION, STRING_FORMAT_OPTION, DATE_FORMAT_OPTION } =
-  useFormat()
+const {
+  NUMBER_FORMAT_OPTION,
+  STRING_FORMAT_OPTION,
+  DATE_FORMAT_OPTION,
+  DURATION_FORMAT_OPTION,
+} = useFormat()
 const { removePrefixAggregate, getLabel } = useChartConfig()

 watch(
@@ -109,57 +133,104 @@ watch(
   { immediate: true, deep: true },
 )

-/** lấy danh sách option */
-function getOptions(item: ValueItemInfo) {
-  /** index của giá trị cần thống kê */
-  const INDEX = item.setting_value_index !== undefined ? item.setting_value_index : item?.related_index
-
-  /** dữ liệu của cấu hình giá trị thống kê */
-  const CONFIG_VALUE = $props.setting?.setting?.value?.[INDEX]
-  /** field nhãn của dữ liệu */
-  let label = CONFIG_VALUE?.name
-  /** giá trị đầu tiên */
-  let first_value = $props.setting?.setting?.value?.[0]
-  /** loại dữ liệu */
-  let type = ''
-
-  // nếu là đếm số lượng
+/**
+ * Xác định kiểu dữ liệu của giá trị đang được cấu hình định dạng.
+ * @param item Giá trị đang được chọn để cấu hình định dạng.
+ * @returns Kiểu dữ liệu tương ứng của giá trị.
+ */
+function resolveValueType(item?: ValueItemInfo) {
+  /** Chỉ số của giá trị trong danh sách cấu hình. */
+  const INDEX =
+    item?.setting_value_index !== undefined
+      ? item.setting_value_index
+      : item?.related_index
+
+  /** Giá trị cấu hình được lấy theo chỉ số đã xác định. */
+  const CONFIG_VALUE =
+    INDEX !== undefined ? $props.setting?.setting?.value?.[INDEX] : undefined
+
+  /** Tên nhãn tạm thời dùng để tra kiểu dữ liệu. */
+  let label_name = CONFIG_VALUE?.name
+
+  /** Giá trị đầu tiên trong cấu hình biểu đồ. */
+  const FIRST_VALUE = $props.setting?.setting?.value?.[0]
+
+  // Nếu nhãn hiện tại hoặc nhãn đầu tiên là trường đếm thì luôn trả về kiểu number.
   if (
-    label?.includes('count_item') ||
-    first_value?.name?.includes('count_item')
+    label_name?.includes('count_item') ||
+    FIRST_VALUE?.name?.includes('count_item')
   ) {
-    type = 'number'
+    // Trả về kiểu number cho trường đếm.
+    return 'number'
   }
-  // nếu là biểu đồ quạt
-  else if ($props.setting?.type === 'pie') {
-    type = $props.fields?.[first_value?.name || '']?.type
+
+  // Nếu biểu đồ là pie thì lấy kiểu dữ liệu trực tiếp từ giá trị đầu tiên.
+  if ($props.setting?.type === 'pie') {
+    // Trả về kiểu dữ liệu của trường đầu tiên trong cấu hình pie.
+    return $props.fields?.[FIRST_VALUE?.name || '']?.type || ''
   }
-  // nếu là group giá trị
-  else if (CONFIG_VALUE?.group_field && CONFIG_VALUE?.group_values?.length) {
-    // loại bỏ các prefix tính toán
-    label = removePrefixAggregate(CONFIG_VALUE.name || '')
-    // lưu lại loại dữ liệu
-    type = $props.fields?.[label || '']?.type
-  } else {
-    // loại bỏ các prefix tính toán
-    label = removePrefixAggregate(label || '')
-    // lưu lại loại dữ liệu
-    type = $props.fields?.[label || '']?.type
+
+  // Nếu giá trị hiện tại là dữ liệu group thì loại bỏ tiền tố aggregate trước khi tra kiểu.
+  if (CONFIG_VALUE?.group_field && CONFIG_VALUE?.group_values?.length) {
+    // Chuẩn hóa lại tên nhãn của trường group.
+    label_name = removePrefixAggregate(CONFIG_VALUE.name || '')
+
+    // Trả về kiểu dữ liệu theo nhãn group đã chuẩn hóa.
+    return $props.fields?.[label_name || '']?.type || ''
   }

-  // trả về các option theo loại dữ liệu
-  switch (type) {
+  // Loại bỏ tiền tố aggregate khỏi nhãn trong trường hợp thông thường.
+  label_name = removePrefixAggregate(label_name || '')
+
+  // Trả về kiểu dữ liệu tương ứng với nhãn đã chuẩn hóa.
+  return $props.fields?.[label_name || '']?.type || ''
+}
+
+/**
+ * Lấy danh sách option định dạng theo kiểu dữ liệu của giá trị.
+ * @param item Giá trị cần lấy danh sách option định dạng.
+ * @returns Danh sách option định dạng tương ứng.
+ */
+function getOptions(item: ValueItemInfo) {
+  /** Kiểu dữ liệu của giá trị đang được cấu hình. */
+  // Xác định kiểu dữ liệu trước khi chọn bộ option định dạng.
+  const TYPE = resolveValueType(item)
+
+  // Chọn danh sách option định dạng theo từng kiểu dữ liệu.
+  switch (TYPE) {
     case 'string':
+      // Trả về danh sách định dạng dành cho chuỗi.
       return STRING_FORMAT_OPTION
     case 'number':
+      // Trả về danh sách định dạng dành cho số.
       return NUMBER_FORMAT_OPTION
+    case 'duration':
+      // Trả về danh sách định dạng dành cho thời lượng.
+      return DURATION_FORMAT_OPTION
     case 'date':
+      // Trả về danh sách định dạng dành cho ngày tháng.
       return DATE_FORMAT_OPTION
     default:
+      // Trả về mảng rỗng khi không xác định được kiểu dữ liệu.
       return []
   }
 }

+/**
+ * Lấy danh sách option định dạng cho trục tung.
+ * @returns Danh sách option định dạng phù hợp với trục tung.
+ */
+function getYAxisFormatOptions() {
+  /** Phần tử giá trị đầu tiên dùng để xác định kiểu định dạng trục tung. */
+  const FIRST_ITEM =
+    show_items.value[0] || $props.setting.setting?.value_items?.[0]
+
+  // Nếu giá trị đầu tiên là duration thì dùng bộ định dạng duration, ngược lại dùng number.
+  return resolveValueType(FIRST_ITEM) === 'duration'
+    ? DURATION_FORMAT_OPTION
+    : NUMBER_FORMAT_OPTION
+}
+
 /** hàm cập nhật format */
 function updateFormat(format: string, index: number) {
   // nếu không phải dạng pie thì update phần tử hiện tại
diff --git a/src/component/ReportView/components/chart/ChartConfig/Layout/FormatLabel.vue b/src/component/ReportView/components/chart/ChartConfig/Layout/FormatLabel.vue
index ce49fbc..bf30a42 100644
--- a/src/component/ReportView/components/chart/ChartConfig/Layout/FormatLabel.vue
+++ b/src/component/ReportView/components/chart/ChartConfig/Layout/FormatLabel.vue
@@ -71,7 +71,12 @@ const $props = defineProps<{
   changeLabelSetting: (value: ChartLabelSetting) => void
 }>()

-const { NUMBER_FORMAT_OPTION, STRING_FORMAT_OPTION, DATE_FORMAT_OPTION } =
+const {
+  NUMBER_FORMAT_OPTION,
+  STRING_FORMAT_OPTION,
+  DATE_FORMAT_OPTION,
+  DURATION_FORMAT_OPTION,
+} =
   useFormat()

 /** chỉ hiển thị toggle cho biểu đồ có trục x */
@@ -99,6 +104,8 @@ function getOptions() {
       return STRING_FORMAT_OPTION
     case 'number':
       return NUMBER_FORMAT_OPTION
+    case 'duration':
+      return DURATION_FORMAT_OPTION
     case 'date':
       return DATE_FORMAT_OPTION
     default:
diff --git a/src/component/ReportView/components/chart/ChartRender.vue b/src/component/ReportView/components/chart/ChartRender.vue
index c46e600..fb99d06 100644
--- a/src/component/ReportView/components/chart/ChartRender.vue
+++ b/src/component/ReportView/components/chart/ChartRender.vue
@@ -332,7 +332,7 @@ const data = computed(() => {
         labels: chart_data?.labels,
         datasets: chart_data?.datasets,
       },
-      VALUE_FIELD?.name,
+      VALUE_FIELD?.name === '$count_item' ? 'count_item' : VALUE_FIELD?.name,
       SORT_VALUE?.includes('asc') ? 'asc' : 'desc',
     )

@@ -696,7 +696,9 @@ function getDatasetColor(

   /** Kiểm tra xem field nhãn có phải là number hoặc date không */
   const IS_NUMERIC_OR_DATE_FIELD =
-    LABEL_FIELD?.type === 'number' || LABEL_FIELD?.type === 'date'
+    LABEL_FIELD?.type === 'number' ||
+    LABEL_FIELD?.type === 'date' ||
+    LABEL_FIELD?.type === 'duration'

   // Nếu là field số hoặc ngày => dùng 1 màu duy nhất từ tên field
   if (IS_NUMERIC_OR_DATE_FIELD) {
diff --git a/src/component/ReportView/constant/data.ts b/src/component/ReportView/constant/data.ts
index 7608ace..039f152 100644
--- a/src/component/ReportView/constant/data.ts
+++ b/src/component/ReportView/constant/data.ts
@@ -1,228 +1,224 @@
 import type {
-  ConditionDataMap
+  ConditionDataItem,
+  ConditionDataMap,
+  DynamicValuePickerType,
+  FilterType,
+  FilterTypeConditionMap,
 } from '@/interface'

-/** các toán tử */
+/** Kiểu tập hợp các loại filter dựng sẵn, không bao gồm custom. */
+type BuiltInFilterType = Exclude<FilterType, 'custom'>
+
+/** Kiểu token condition được hỗ trợ bởi các loại filter dựng sẵn. */
+type ConditionToken = FilterTypeConditionMap[BuiltInFilterType]
+
+/** Kiểu cấu hình danh sách condition theo từng loại filter. */
+type ConditionConfigMap = { [K in FilterType]: FilterTypeConditionMap[K][] }
+
+/** Danh sách condition dành cho dữ liệu kiểu chuỗi. */
+const TEXT_CONDITIONS = [
+  '$in',
+  '$eq',
+  '$ne',
+  '$contains',
+  '$not_contains',
+  '$starts_with',
+  '$ends_with',
+] as const
+
+/** Danh sách condition so sánh dành cho dữ liệu số, ngày và duration. */
+const COMPARE_CONDITIONS = [
+  '$eq',
+  '$ne',
+  '$gt',
+  '$gte',
+  '$lt',
+  '$lte',
+  '$between',
+] as const
+
+/** Danh sách condition so sánh bằng và khác bằng. */
+const EQUALITY_CONDITIONS = ['$eq', '$ne'] as const
+
+/** Danh sách condition quan hệ thường dùng cho enum và các đối tượng liên kết. */
+const RELATION_CONDITIONS = ['$in', '$eq', '$ne'] as const
+
+/** Danh sách condition dành cho dữ liệu json. */
+const JSON_CONDITIONS = ['$array_contains', '$string_contains'] as const
+
+/** Bảng ánh xạ nhãn hiển thị của từng condition. */
+const CONDITION_LABELS = {
+  '$in': 'Nằm trong mảng (in)',
+  '$eq': 'Bằng (=)',
+  '$ne': 'Không bằng (!=)',
+  '$contains': 'Chứa chuỗi (contains)',
+  '$not_contains': 'Không chứa chuỗi (not contains)',
+  '$starts_with': 'Bắt đầu chuỗi (starts with)',
+  '$ends_with': 'Kết thúc chuỗi (ends with)',
+  '$gt': 'Lớn hơn (>)',
+  '$gte': 'Lớn hơn hoặc bằng (>=)',
+  '$lt': 'Nhỏ hơn (<)',
+  '$lte': 'Nhỏ hơn hoặc bằng (<=)',
+  '$between': 'Trong khoảng (>=, <=)',
+  '$array_contains': 'Danh sách chứa (array contains)',
+  '$string_contains': 'Nội dung chứa (string contains)',
+} satisfies Record<ConditionToken, string>
+
+/** Bảng ánh xạ UI mặc định theo từng loại filter. */
+const DEFAULT_UI_BY_TYPE = {
+  string: 'SingleStringInput',
+  number: 'SingleNumberInput',
+  duration: 'SingleNumberInput',
+  date: 'SingleDateInput',
+  boolean: 'SingleStringInput',
+  json: 'SingleStringInput',
+  enum: 'SingleStringInput',
+  contact: 'SingleStringInput',
+  department: 'SingleStringInput',
+  employee: 'SingleStringInput',
+  branch: 'SingleStringInput',
+  custom: 'SingleStringInput',
+} satisfies Record<FilterType, DynamicValuePickerType>
+
+/** Bảng ghi đè UI theo từng condition đặc thù của từng loại filter. */
+const CONDITION_UI_OVERRIDES = {
+  string: {
+    '$in': 'SearchMultipleSelect',
+  },
+  number: {
+    '$between': 'RangeNumberInput',
+  },
+  duration: {
+    '$between': 'RangeNumberInput',
+  },
+  date: {
+    '$between': 'RangeDateInput',
+  },
+  boolean: {},
+  json: {},
+  enum: {
+    '$in': 'SearchMultipleSelect',
+  },
+  contact: {
+    '$in': 'SearchMultipleSelect',
+  },
+  department: {
+    '$in': 'SearchMultipleSelect',
+  },
+  employee: {
+    '$in': 'SearchMultipleSelect',
+  },
+  branch: {
+    '$in': 'SearchMultipleSelect',
+  },
+  custom: {},
+} satisfies {
+  [K in FilterType]: Partial<
+    Record<FilterTypeConditionMap[K], DynamicValuePickerType>
+  >
+}
+
+/**
+ * Lấy nhãn hiển thị cho condition.
+ * @param condition Condition cần lấy nhãn hiển thị.
+ */
+function getConditionLabel<T extends FilterType>(
+  condition: FilterTypeConditionMap[T],
+) {
+  // Trả về nhãn đã cấu hình sẵn, nếu không có thì dùng chính condition.
+  return CONDITION_LABELS[condition as ConditionToken] ?? condition
+}
+
+/**
+ * Lấy loại UI tương ứng với condition của từng loại filter.
+ * @param type Loại filter hiện tại.
+ * @param condition Condition đang cần xác định UI.
+ */
+function getConditionUi<T extends FilterType>(
+  type: T,
+  condition: FilterTypeConditionMap[T],
+): DynamicValuePickerType {
+  /** Lấy cấu hình UI được ghi đè cho loại filter hiện tại. */
+  const OVERRIDES = CONDITION_UI_OVERRIDES[type] as Partial<
+    Record<FilterTypeConditionMap[T], DynamicValuePickerType>
+  >
+
+  // Ưu tiên UI ghi đè, nếu không có thì dùng UI mặc định theo type.
+  return OVERRIDES[condition] ?? DEFAULT_UI_BY_TYPE[type]
+}
+
+/**
+ * Dựng danh sách item condition hoàn chỉnh cho từng loại filter.
+ * @param type Loại filter hiện tại.
+ * @param conditions Danh sách condition cần dựng thành item hiển thị.
+ */
+function buildConditionItems<T extends FilterType>(
+  type: T,
+  conditions: readonly FilterTypeConditionMap[T][],
+): ConditionDataItem<T>[] {
+  // Chuyển danh sách token condition thành danh sách item đầy đủ cho UI.
+  return conditions.map((condition) => ({
+    // Gán token condition hiện tại.
+    condition,
+    // Gán UI tương ứng với type và condition hiện tại.
+    ui_value: getConditionUi(type, condition),
+    // Gán nhãn hiển thị cho condition hiện tại.
+    label: getConditionLabel(condition),
+  }))
+}
+
+/** Cấu hình danh sách condition theo từng loại filter. */
+export const CONDITION_CONFIG: ConditionConfigMap = {
+  // Cấu hình condition cho dữ liệu chuỗi.
+  string: [...TEXT_CONDITIONS],
+  // Cấu hình condition cho dữ liệu số.
+  number: [...COMPARE_CONDITIONS],
+  // Cấu hình condition cho dữ liệu thời lượng.
+  duration: [...COMPARE_CONDITIONS],
+  // Cấu hình condition cho dữ liệu ngày tháng.
+  date: [...COMPARE_CONDITIONS],
+  // Cấu hình condition cho dữ liệu boolean.
+  boolean: [...EQUALITY_CONDITIONS],
+  // Cấu hình condition cho dữ liệu json.
+  json: [...JSON_CONDITIONS],
+  // Cấu hình condition cho dữ liệu enum.
+  enum: [...RELATION_CONDITIONS],
+  // Cấu hình condition cho dữ liệu contact.
+  contact: [...RELATION_CONDITIONS],
+  // Cấu hình condition cho dữ liệu department.
+  department: [...RELATION_CONDITIONS],
+  // Cấu hình condition cho dữ liệu employee.
+  employee: [...RELATION_CONDITIONS],
+  // Cấu hình condition cho dữ liệu branch.
+  branch: [...RELATION_CONDITIONS],
+  // Cấu hình condition cho dữ liệu custom.
+  custom: [],
+}
+
+/** Danh sách condition đầy đủ dùng trực tiếp cho UI filter builder. */
 export const CONDITION: ConditionDataMap = {
-  string: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleStringInput',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleStringInput',
-      label: 'Không bằng (!=)',
-    },
-    {
-      condition: '$contains',
-      ui_value: 'SingleStringInput',
-      label: 'Chứa chuỗi (contains)',
-    },
-    {
-      condition: '$not_contains',
-      ui_value: 'SingleStringInput',
-      label: 'Không chứa chuỗi (not contains)',
-    },
-    {
-      condition: '$starts_with',
-      ui_value: 'SingleStringInput',
-      label: 'Bắt đầu chuỗi (starts with)',
-    },
-    {
-      condition: '$ends_with',
-      ui_value: 'SingleStringInput',
-      label: 'Kết thúc chuỗi (ends with)',
-    },
-  ],
-  number: [
-    {
-      condition: '$eq',
-      ui_value: 'SingleNumberInput',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleNumberInput',
-      label: 'Không bằng (!=)',
-    },
-    {
-      condition: '$gt',
-      ui_value: 'SingleNumberInput',
-      label: 'Lớn hơn (>)',
-    },
-    {
-      condition: '$gte',
-      ui_value: 'SingleNumberInput',
-      label: 'Lớn hơn hoặc bằng (>=)',
-    },
-    {
-      condition: '$lt',
-      ui_value: 'SingleNumberInput',
-      label: 'Nhỏ hơn (<)',
-    },
-    {
-      condition: '$lte',
-      ui_value: 'SingleNumberInput',
-      label: 'Nhỏ hơn hoặc bằng (<=)',
-    },
-    {
-      condition: '$between',
-      ui_value: 'RangeNumberInput',
-      label: 'Trong khoảng (>=, <=)',
-    },
-  ],
-  date: [
-    {
-      condition: '$eq',
-      ui_value: 'SingleDateInput',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleDateInput',
-      label: 'Không bằng (!=)',
-    },
-    {
-      condition: '$gt',
-      ui_value: 'SingleDateInput',
-      label: 'Lớn hơn (>)',
-    },
-    {
-      condition: '$gte',
-      ui_value: 'SingleDateInput',
-      label: 'Lớn hơn hoặc bằng (>=)',
-    },
-    {
-      condition: '$lt',
-      ui_value: 'SingleDateInput',
-      label: 'Nhỏ hơn (<)',
-    },
-    {
-      condition: '$lte',
-      ui_value: 'SingleDateInput',
-      label: 'Nhỏ hơn hoặc bằng (<=)',
-    },
-    {
-      condition: '$between',
-      ui_value: 'RangeDateInput',
-      label: 'Trong khoảng (>=, <=)',
-    },
-  ],
-  boolean: [
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  json: [
-    {
-      condition: '$array_contains',
-      ui_value: 'SingleStringInput',
-      label: 'Danh sách chứa (array contains)',
-    },
-    {
-      condition: '$string_contains',
-      ui_value: 'SingleStringInput',
-      label: 'Nội dung chứa (string contains)',
-    },
-  ],
-  enum: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  contact: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  department: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  employee: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  branch: [
-    {
-      condition: '$in',
-      ui_value: 'SearchMultipleSelect',
-      label: 'Nằm trong mảng (in)',
-    },
-    {
-      condition: '$eq',
-      ui_value: 'SingleSelect',
-      label: 'Bằng (=)',
-    },
-    {
-      condition: '$ne',
-      ui_value: 'SingleSelect',
-      label: 'Không bằng (!=)',
-    },
-  ],
-  custom: []
+  // Dựng danh sách condition cho dữ liệu chuỗi.
+  string: buildConditionItems('string', CONDITION_CONFIG.string),
+  // Dựng danh sách condition cho dữ liệu số.
+  number: buildConditionItems('number', CONDITION_CONFIG.number),
+  // Dựng danh sách condition cho dữ liệu thời lượng.
+  duration: buildConditionItems('duration', CONDITION_CONFIG.duration),
+  // Dựng danh sách condition cho dữ liệu ngày tháng.
+  date: buildConditionItems('date', CONDITION_CONFIG.date),
+  // Dựng danh sách condition cho dữ liệu boolean.
+  boolean: buildConditionItems('boolean', CONDITION_CONFIG.boolean),
+  // Dựng danh sách condition cho dữ liệu json.
+  json: buildConditionItems('json', CONDITION_CONFIG.json),
+  // Dựng danh sách condition cho dữ liệu enum.
+  enum: buildConditionItems('enum', CONDITION_CONFIG.enum),
+  // Dựng danh sách condition cho dữ liệu contact.
+  contact: buildConditionItems('contact', CONDITION_CONFIG.contact),
+  // Dựng danh sách condition cho dữ liệu department.
+  department: buildConditionItems('department', CONDITION_CONFIG.department),
+  // Dựng danh sách condition cho dữ liệu employee.
+  employee: buildConditionItems('employee', CONDITION_CONFIG.employee),
+  // Dựng danh sách condition cho dữ liệu branch.
+  branch: buildConditionItems('branch', CONDITION_CONFIG.branch),
+  // Dựng danh sách condition cho dữ liệu custom.
+  custom: buildConditionItems('custom', CONDITION_CONFIG.custom),
 }
diff --git a/src/component/ReportView/hook/useFormat.ts b/src/component/ReportView/hook/useFormat.ts
index a180874..470f94b 100644
--- a/src/component/ReportView/hook/useFormat.ts
+++ b/src/component/ReportView/hook/useFormat.ts
@@ -133,6 +133,19 @@ export function useFormat() {
     },
   ]

+  /** danh sách option format khoảng thời gian */
+  const DURATION_FORMAT_OPTION = [
+    {
+      label: 'Định dạng mặc định',
+      value: undefined,
+    },
+    {
+      label: 'Khoảng thời gian',
+      value: 'duration',
+      description: '24:01:00',
+    },
+  ]
+
   /** các dạng format */
   const FORMAT = {
     /** format dạng số */
@@ -327,6 +340,7 @@ export function useFormat() {
     NUMBER_FORMAT_OPTION,
     STRING_FORMAT_OPTION,
     DATE_FORMAT_OPTION,
+    DURATION_FORMAT_OPTION,
     FORMAT,
     postFormatData,
     formatLabelData,
diff --git a/src/component/ReportView/hook/useTableStatisticConfig.ts b/src/component/ReportView/hook/useTableStatisticConfig.ts
index ee8c4d5..f5b1ce6 100644
--- a/src/component/ReportView/hook/useTableStatisticConfig.ts
+++ b/src/component/ReportView/hook/useTableStatisticConfig.ts
@@ -239,6 +239,7 @@ export function useTableStatisticConfig(props: {
       boolean: 'text',
       date: 'date',
       number: 'number',
+      duration: 'number',
       string: 'text',
       enum: 'text',
       branch: 'text',
@@ -444,4 +445,3 @@ export function useTableStatisticConfig(props: {
     data,
   }
 }
-
diff --git a/src/component/hook/useGroupFieldsByType.ts b/src/component/hook/useGroupFieldsByType.ts
index db3e096..8274b9f 100644
--- a/src/component/hook/useGroupFieldsByType.ts
+++ b/src/component/hook/useGroupFieldsByType.ts
@@ -64,6 +64,7 @@ export function groupFieldsByType<T extends FieldWithType>(fields: T[]): T[][] {
   fields.forEach((field) => {
     switch (field.type) {
       case 'date':
+      case 'duration':
         GROUPED_FIELDS['date'] = [...(GROUPED_FIELDS?.['date'] || []), field]
         break
       case 'number':
diff --git a/src/constant/field.ts b/src/constant/field.ts
index 1af2778..13689af 100644
--- a/src/constant/field.ts
+++ b/src/constant/field.ts
@@ -17,6 +17,10 @@ export const FIELD_ICON: Record<string, { icon: any; tooltip: string }> = {
     icon: CalendarDaysIcon,
     tooltip: 'Ngày tháng',
   },
+  duration: {
+    icon: CalendarDaysIcon,
+    tooltip: 'Khoảng thời gian',
+  },
   number: {
     icon: BinaryIcon,
     tooltip: 'Số lượng',
diff --git a/src/interface/field.ts b/src/interface/field.ts
index d483a55..f346478 100644
--- a/src/interface/field.ts
+++ b/src/interface/field.ts
@@ -5,6 +5,7 @@ export type FieldType =
   | 'string'
   | 'number'
   | 'date'
+  | 'duration'
   | 'enum'
   | 'boolean'
   | 'contact'
diff --git a/src/interface/query.ts b/src/interface/query.ts
index 5554380..72ac59b 100644
--- a/src/interface/query.ts
+++ b/src/interface/query.ts
@@ -239,6 +239,7 @@ export interface FilterTypeConditionMap {
     | '$ends_with'
   enum: '$in' | '$eq' | '$ne'
   number: '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$between'
+  duration: '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$between'
   date: '$eq' | '$ne' | '$gt' | '$gte' | '$lt' | '$lte' | '$between'
   boolean: '$eq' | '$ne'
   json: '$array_contains' | '$string_contains'
@@ -253,7 +254,7 @@ export interface FilterTypeConditionMap {
 export type FilterType = keyof FilterTypeConditionMap

 /** cấu hình dữ liệu của 1 toán tử */
-interface ConditionDataItem<T extends FilterType> {
+export interface ConditionDataItem<T extends FilterType> {
   /** loại toán tử */
   condition: FilterTypeConditionMap[T]
   /** loại UI nhập dữ liệu */
diff --git a/src/utils/api.ts b/src/utils/api.ts
index 72d10ac..fbc9580 100644
--- a/src/utils/api.ts
+++ b/src/utils/api.ts
@@ -342,14 +342,16 @@ function getBody(param: {
     return { search }
   }

+  /** sử dụng toán tử $gt */
+  const USE_GT = type === 'duration' || type === 'number'
+
   /** toán tử để query dữ liệu theo từng loại */
-  const CONDITION =
-    type === 'number' ? '$gt' : type === 'string' ? '$contains' : ''
+  const CONDITION = USE_GT ? '$gt' : type === 'string' ? '$contains' : ''

   /** tên field sẽ search */
   const FIELD = field_config?.field_name_in_query || ''
   /** giá trị sau khi format */
-  const FORMATED_VALUE = type === 'number' ? Number(search) : search
+  const FORMATED_VALUE = USE_GT ? Number(search) : search

   return {
     query: {

`;
