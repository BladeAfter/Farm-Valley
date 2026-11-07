// Additional CLDR forms for languages with more than singular/plural.
export const pluralOverrides: Record<string, Record<string, string>> = {
 ru: { "orders.count_few": "{{count}} заказа", "orders.count_many": "{{count}} заказов", "animals.count_few": "{{count}} животных", "animals.count_many": "{{count}} животных" },
 pl: { "orders.count_few": "{{count}} zamówienia", "orders.count_many": "{{count}} zamówień", "animals.count_few": "{{count}} zwierzęta", "animals.count_many": "{{count}} zwierząt" },
 ar: { "orders.count_zero": "{{count}} طلب", "orders.count_two": "طلبان ({{count}})", "orders.count_few": "{{count}} طلبات", "orders.count_many": "{{count}} طلبًا", "animals.count_zero": "{{count}} حيوان", "animals.count_two": "حيوانان ({{count}})", "animals.count_few": "{{count}} حيوانات", "animals.count_many": "{{count}} حيوانًا" },
};
