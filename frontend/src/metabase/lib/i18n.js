import dayjs from "dayjs";
import moment from "moment-timezone"; // eslint-disable-line no-restricted-imports -- deprecated usage
import { addLocale, useLocale } from "ttag";

import { isEmbeddingSdk } from "metabase/embedding-sdk/config";
import api from "metabase/lib/api";
import { DAY_OF_WEEK_OPTIONS } from "metabase/lib/date-time";
import MetabaseSettings from "metabase/lib/settings";

// note this won't refresh strings that are evaluated at load time
export async function loadLocalization(locale) {
  // eslint-disable-next-line no-console
  console.log("[i18n] loadLocalization called with locale:", locale);

  // we need to be sure to set the initial localization before loading any files
  // so load metabase/services only when we need it
  // load and parse the locale
  const translationsObject =
    locale !== "en"
      ? // We don't use I18NApi.locale/the GET helper because those helpers adds custom headers,
        // which will make the browser do the pre-flight request on the SDK.
        // The backend doesn't seem to support pre-flight request on the static assets, but even
        // if it supported them it's more performant to skip the pre-flight request
        await fetch(`${api.basename}/app/locales/${locale}.json`).then(
          async (response) => {
            const json = await response.json();
            // eslint-disable-next-line no-console
            console.log(`[i18n] Translation file loaded for locale: ${locale}`);
            const translations = json?.translations?.[""] || {};
            const hasBrandKeywords = "Brand Keywords" in translations;
            const hasQueryText = "Query Text" in translations;
            const hasTaskId = "Task ID" in translations;
            const hasCategory = "Category" in translations;
            const hasEnabled = "Enabled" in translations;
            const hasActions = "Actions" in translations;
            const hasYes = "Yes" in translations;
            const hasNo = "No" in translations;
            const hasGeoTasks = "Geo Tasks" in translations;
            const hasCreateGeoTask = "Create Geo Task" in translations;
            const hasExecute = "Execute" in translations;
            const hasGeoTask = "GeoTask" in translations;
            const hasCreateNewGeoTask = "Create a new geo task" in translations;

            // 如果缺少翻译且是中文语言，添加中文兜底
            if (
              locale === "zh-CN" ||
              locale === "zh" ||
              locale.startsWith("zh")
            ) {
              if (!hasBrandKeywords) {
                // eslint-disable-next-line no-console
                console.log(
                  `[i18n] Adding fallback translation for "Brand Keywords"`,
                );
                translations["Brand Keywords"] = {
                  msgid: "Brand Keywords",
                  msgstr: ["品牌关键词"],
                };
              }
              if (!hasQueryText) {
                // eslint-disable-next-line no-console
                console.log(
                  `[i18n] Adding fallback translation for "Query Text"`,
                );
                translations["Query Text"] = {
                  msgid: "Query Text",
                  msgstr: ["AI问题"],
                };
              }
              if (!hasTaskId) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "Task ID"`);
                translations["Task ID"] = {
                  msgid: "Task ID",
                  msgstr: ["任务ID"],
                };
              }
              if (!hasEnabled) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "Enabled"`);
                translations["Enabled"] = {
                  msgid: "Enabled",
                  msgstr: ["启用"],
                };
              }
              if (!hasActions) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "Actions"`);
                translations["Actions"] = {
                  msgid: "Actions",
                  msgstr: ["动作"],
                };
              }
              if (!hasYes) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "Yes"`);
                translations["Yes"] = {
                  msgid: "Yes",
                  msgstr: ["是"],
                };
              }
              if (!hasNo) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "No"`);
                translations["No"] = {
                  msgid: "No",
                  msgstr: ["否"],
                };
              }
              if (!hasGeoTasks) {
                // eslint-disable-next-line no-console
                console.log(
                  `[i18n] Adding fallback translation for "Geo Tasks"`,
                );
                translations["Geo Tasks"] = {
                  msgid: "Geo Tasks",
                  msgstr: ["Geo任务"],
                };
              }
              if (!hasCreateGeoTask) {
                // eslint-disable-next-line no-console
                console.log(
                  `[i18n] Adding fallback translation for "Create Geo Task"`,
                );
                translations["Create Geo Task"] = {
                  msgid: "Create Geo Task",
                  msgstr: ["创建Geo任务"],
                };
              }
              if (!hasExecute) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "Execute"`);
                translations["Execute"] = {
                  msgid: "Execute",
                  msgstr: ["执行"],
                };
              }
              if (!hasGeoTask) {
                // eslint-disable-next-line no-console
                console.log(`[i18n] Adding fallback translation for "GeoTask"`);
                translations["GeoTask"] = {
                  msgid: "GeoTask",
                  msgstr: ["Geo任务"],
                };
              }
              if (!hasCreateNewGeoTask) {
                // eslint-disable-next-line no-console
                console.log(
                  `[i18n] Adding fallback translation for "Create a new geo task"`,
                );
                translations["Create a new geo task"] = {
                  msgid: "Create a new geo task",
                  msgstr: ["创建新的Geo任务"],
                };
              }
            }

            // eslint-disable-next-line no-console
            console.log(`[i18n] Translation check:`, {
              hasBrandKeywords: "Brand Keywords" in translations,
              hasQueryText: "Query Text" in translations,
              hasTaskId: "Task ID" in translations,
              hasEnabled: "Enabled" in translations,
              hasActions: "Actions" in translations,
              hasYes: "Yes" in translations,
              hasNo: "No" in translations,
              hasGeoTasks: "Geo Tasks" in translations,
              hasCreateGeoTask: "Create Geo Task" in translations,
              hasExecute: "Execute" in translations,
              hasGeoTask: "GeoTask" in translations,
              hasCreateNewGeoTask: "Create a new geo task" in translations,
              hasCategory,
              brandKeywordsValue: translations["Brand Keywords"] || "NOT FOUND",
              queryTextValue: translations["Query Text"] || "NOT FOUND",
              taskIdValue: translations["Task ID"] || "NOT FOUND",
              enabledValue: translations["Enabled"] || "NOT FOUND",
              actionsValue: translations["Actions"] || "NOT FOUND",
              yesValue: translations["Yes"] || "NOT FOUND",
              noValue: translations["No"] || "NOT FOUND",
              geoTasksValue: translations["Geo Tasks"] || "NOT FOUND",
              createGeoTaskValue:
                translations["Create Geo Task"] || "NOT FOUND",
              executeValue: translations["Execute"] || "NOT FOUND",
              geoTaskValue: translations["GeoTask"] || "NOT FOUND",
              createNewGeoTaskValue:
                translations["Create a new geo task"] || "NOT FOUND",
              categoryValue: hasCategory
                ? translations["Category"]
                : "NOT FOUND",
              totalTranslations: Object.keys(translations).length,
            });
            return json;
          },
        )
      : // We don't serve en.json. Instead, use this object to fall back to theliterals.
        {
          headers: {
            language: "en",
            "plural-forms": "nplurals=2; plural=(n != 1);",
          },
          translations: {
            // eslint-disable-next-line no-literal-metabase-strings -- Not a user facing string
            "": { Metabase: { msgid: "Metabase", msgstr: ["Metabase"] } },
          },
        };
  setLocalization(translationsObject);

  return translationsObject;
}

// Tell moment.js and dayjs to use the value of the start-of-week Setting for its current locale
// Moment.js dow range Sunday (0) - Saturday (6)
export function updateStartOfWeek(startOfWeekDayName) {
  const startOfWeekDay = getStartOfWeekDay(startOfWeekDayName);
  if (startOfWeekDay != null) {
    moment.updateLocale(moment.locale(), { week: { dow: startOfWeekDay } });
    dayjs.updateLocale(dayjs.locale(), { weekStart: startOfWeekDay });
  }
}

// if the start of week Setting is updated, update the moment start of week
MetabaseSettings.on("start-of-week", updateStartOfWeek);

function setLanguage(translationsObject) {
  const locale = translationsObject.headers.language;
  const translations = translationsObject.translations?.[""] || {};

  // 如果缺少翻译且是中文语言，添加中文兜底
  if (locale === "zh-CN" || locale === "zh" || locale.startsWith("zh")) {
    if (!("Brand Keywords" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Brand Keywords" in setLanguage`,
      );
      translations["Brand Keywords"] = {
        msgid: "Brand Keywords",
        msgstr: ["品牌关键词"],
      };
    }
    if (!("Query Text" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Query Text" in setLanguage`,
      );
      translations["Query Text"] = {
        msgid: "Query Text",
        msgstr: ["AI问题"],
      };
    }
    if (!("Task ID" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Task ID" in setLanguage`,
      );
      translations["Task ID"] = {
        msgid: "Task ID",
        msgstr: ["任务ID"],
      };
    }
    if (!("Enabled" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Enabled" in setLanguage`,
      );
      translations["Enabled"] = {
        msgid: "Enabled",
        msgstr: ["启用"],
      };
    }
    if (!("Actions" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Actions" in setLanguage`,
      );
      translations["Actions"] = {
        msgid: "Actions",
        msgstr: ["动作"],
      };
    }
    if (!("Yes" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Yes" in setLanguage`,
      );
      translations["Yes"] = {
        msgid: "Yes",
        msgstr: ["是"],
      };
    }
    if (!("No" in translations)) {
      // eslint-disable-next-line no-console
      console.log(`[i18n] Adding fallback translation for "No" in setLanguage`);
      translations["No"] = {
        msgid: "No",
        msgstr: ["否"],
      };
    }
    if (!("Geo Tasks" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Geo Tasks" in setLanguage`,
      );
      translations["Geo Tasks"] = {
        msgid: "Geo Tasks",
        msgstr: ["Geo任务"],
      };
    }
    if (!("Create Geo Task" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Create Geo Task" in setLanguage`,
      );
      translations["Create Geo Task"] = {
        msgid: "Create Geo Task",
        msgstr: ["创建Geo任务"],
      };
    }
    if (!("Execute" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Execute" in setLanguage`,
      );
      translations["Execute"] = {
        msgid: "Execute",
        msgstr: ["执行"],
      };
    }
    if (!("GeoTask" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "GeoTask" in setLanguage`,
      );
      translations["GeoTask"] = {
        msgid: "GeoTask",
        msgstr: ["Geo任务"],
      };
    }
    if (!("Create a new geo task" in translations)) {
      // eslint-disable-next-line no-console
      console.log(
        `[i18n] Adding fallback translation for "Create a new geo task" in setLanguage`,
      );
      translations["Create a new geo task"] = {
        msgid: "Create a new geo task",
        msgstr: ["创建新的Geo任务"],
      };
    }
  }

  // Debug: Check before addMsgIds
  // eslint-disable-next-line no-console
  console.log(`[i18n] setLanguage BEFORE addMsgIds:`, {
    locale,
    hasBrandKeywords: "Brand Keywords" in translations,
    hasQueryText: "Query Text" in translations,
    hasTaskId: "Task ID" in translations,
    hasEnabled: "Enabled" in translations,
    hasActions: "Actions" in translations,
    hasYes: "Yes" in translations,
    hasNo: "No" in translations,
    hasGeoTasks: "Geo Tasks" in translations,
    hasCreateGeoTask: "Create Geo Task" in translations,
    hasExecute: "Execute" in translations,
    hasGeoTask: "GeoTask" in translations,
    hasCreateNewGeoTask: "Create a new geo task" in translations,
    hasCategory: "Category" in translations,
  });

  addMsgIds(translationsObject);

  // Debug: Check after addMsgIds
  const translationsAfter = translationsObject.translations?.[""] || {};
  // eslint-disable-next-line no-console
  console.log(`[i18n] setLanguage AFTER addMsgIds:`, {
    locale,
    hasBrandKeywords: "Brand Keywords" in translationsAfter,
    brandKeywordsValue: translationsAfter["Brand Keywords"],
    hasQueryText: "Query Text" in translationsAfter,
    queryTextValue: translationsAfter["Query Text"],
    hasTaskId: "Task ID" in translationsAfter,
    taskIdValue: translationsAfter["Task ID"],
    hasEnabled: "Enabled" in translationsAfter,
    enabledValue: translationsAfter["Enabled"],
    hasActions: "Actions" in translationsAfter,
    actionsValue: translationsAfter["Actions"],
    hasYes: "Yes" in translationsAfter,
    yesValue: translationsAfter["Yes"],
    hasNo: "No" in translationsAfter,
    noValue: translationsAfter["No"],
    hasGeoTasks: "Geo Tasks" in translationsAfter,
    geoTasksValue: translationsAfter["Geo Tasks"],
    hasCreateGeoTask: "Create Geo Task" in translationsAfter,
    createGeoTaskValue: translationsAfter["Create Geo Task"],
    hasExecute: "Execute" in translationsAfter,
    executeValue: translationsAfter["Execute"],
    hasGeoTask: "GeoTask" in translationsAfter,
    geoTaskValue: translationsAfter["GeoTask"],
    hasCreateNewGeoTask: "Create a new geo task" in translationsAfter,
    createNewGeoTaskValue: translationsAfter["Create a new geo task"],
    hasCategory: "Category" in translationsAfter,
    categoryValue: translationsAfter["Category"],
  });

  // add and set locale with ttag
  addLocale(locale, translationsObject);
  // eslint-disable-next-line react-hooks/rules-of-hooks
  useLocale(locale);

  // 如果是中文语言，在 addLocale 之后再次确保兜底翻译被注册到 ttag
  if (locale === "zh-CN" || locale === "zh" || locale.startsWith("zh")) {
    try {
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore - Accessing ttag internal state to add fallback translations
      const ttagTranslations = window.__ttag_translations__;
      if (ttagTranslations) {
        // ttag 的结构可能是 ttagTranslations[""] 或 ttagTranslations[locale].translations[""]
        let ttagMsgs = null;
        if (ttagTranslations[""]) {
          ttagMsgs = ttagTranslations[""];
        } else if (
          ttagTranslations[locale] &&
          ttagTranslations[locale].translations
        ) {
          ttagMsgs = ttagTranslations[locale].translations[""];
        }

        if (ttagMsgs) {
          const fallbackTranslations = {
            "Brand Keywords": {
              msgid: "Brand Keywords",
              msgstr: ["品牌关键词"],
            },
            "Query Text": { msgid: "Query Text", msgstr: ["AI问题"] },
            "Task ID": { msgid: "Task ID", msgstr: ["任务ID"] },
            Enabled: { msgid: "Enabled", msgstr: ["启用"] },
            Actions: { msgid: "Actions", msgstr: ["动作"] },
            Yes: { msgid: "Yes", msgstr: ["是"] },
            No: { msgid: "No", msgstr: ["否"] },
            "Geo Tasks": { msgid: "Geo Tasks", msgstr: ["Geo任务"] },
            "Create Geo Task": {
              msgid: "Create Geo Task",
              msgstr: ["创建Geo任务"],
            },
            Execute: { msgid: "Execute", msgstr: ["执行"] },
            GeoTask: { msgid: "GeoTask", msgstr: ["Geo任务"] },
            "Create a new geo task": {
              msgid: "Create a new geo task",
              msgstr: ["创建新的Geo任务"],
            },
          };

          for (const [key, value] of Object.entries(fallbackTranslations)) {
            if (!(key in ttagMsgs)) {
              // eslint-disable-next-line no-console
              console.log(
                `[i18n] Adding fallback "${key}" directly to ttag translations`,
              );
              ttagMsgs[key] = value;
            }
          }
        }
      }
    } catch (e) {
      // eslint-disable-next-line no-console
      console.warn(`[i18n] Could not add fallback translations to ttag:`, e);
    }
  }

  // Debug: Check ttag state after useLocale
  try {
    // eslint-disable-next-line no-console
    const ttagTranslations = window.__ttag_translations__;
    // eslint-disable-next-line no-console
    console.log(`[i18n] setLanguage AFTER useLocale - ttag state:`, {
      hasBrandKeywords: ttagTranslations?.[""]?.["Brand Keywords"]
        ? true
        : false,
      brandKeywordsValue: ttagTranslations?.[""]?.["Brand Keywords"],
      hasQueryText: ttagTranslations?.[""]?.["Query Text"] ? true : false,
      queryTextValue: ttagTranslations?.[""]?.["Query Text"],
      hasTaskId: ttagTranslations?.[""]?.["Task ID"] ? true : false,
      taskIdValue: ttagTranslations?.[""]?.["Task ID"],
      hasEnabled: ttagTranslations?.[""]?.["Enabled"] ? true : false,
      enabledValue: ttagTranslations?.[""]?.["Enabled"],
      hasActions: ttagTranslations?.[""]?.["Actions"] ? true : false,
      actionsValue: ttagTranslations?.[""]?.["Actions"],
      hasYes: ttagTranslations?.[""]?.["Yes"] ? true : false,
      yesValue: ttagTranslations?.[""]?.["Yes"],
      hasNo: ttagTranslations?.[""]?.["No"] ? true : false,
      noValue: ttagTranslations?.[""]?.["No"],
      hasGeoTasks: ttagTranslations?.[""]?.["Geo Tasks"] ? true : false,
      geoTasksValue: ttagTranslations?.[""]?.["Geo Tasks"],
      hasCreateGeoTask: ttagTranslations?.[""]?.["Create Geo Task"]
        ? true
        : false,
      createGeoTaskValue: ttagTranslations?.[""]?.["Create Geo Task"],
      hasExecute: ttagTranslations?.[""]?.["Execute"] ? true : false,
      executeValue: ttagTranslations?.[""]?.["Execute"],
      hasGeoTask: ttagTranslations?.[""]?.["GeoTask"] ? true : false,
      geoTaskValue: ttagTranslations?.[""]?.["GeoTask"],
      hasCreateNewGeoTask: ttagTranslations?.[""]?.["Create a new geo task"]
        ? true
        : false,
      createNewGeoTaskValue: ttagTranslations?.[""]?.["Create a new geo task"],
      hasCategory: ttagTranslations?.[""]?.["Category"] ? true : false,
      categoryValue: ttagTranslations?.[""]?.["Category"],
    });
  } catch (e) {
    // eslint-disable-next-line no-console
    console.log(`[i18n] Could not access ttag state:`, e);
  }
}

const ARABIC_LOCALES = ["ar", "ar-sa"];

export function setLocalization(translationsObject) {
  const language = translationsObject.headers.language;
  setLanguage(translationsObject);
  updateMomentLocale(language);
  updateDayjsLocale(language);
  updateStartOfWeek(MetabaseSettings.get("start-of-week"));

  if (ARABIC_LOCALES.includes(language)) {
    preverseLatinNumbersInMomentLocale(language);
    preverseLatinNumbersInDayjsLocale(language);
  }
}

function updateMomentLocale(language) {
  const locale = getLocale(language);

  try {
    if (locale !== "en") {
      require(`moment/locale/${locale}.js`);
    }
    moment.locale(locale);
  } catch (e) {
    console.warn(`Could not set moment.js locale to ${locale}`);
    moment.locale("en");
  }
}

/**
 * Ensures that we consistently use latin numbers in Arabic locales.
 * See https://github.com/metabase/metabase/issues/34271
 */
function preverseLatinNumbersInMomentLocale(locale) {
  moment.updateLocale(locale, {
    // Preserve latin numbers, but still replace commas.
    // See https://github.com/moment/moment/blob/000ac1800e620f770f4eb31b5ae908f6167b0ab2/locale/ar.js#L185
    postformat: (string) =>
      string.replace(/\d/g, (match) => match).replace(/,/g, "،"),
  });
}

// a copy of moment function
function preverseLatinNumbersInDayjsLocale(locale) {
  dayjs.updateLocale(locale, {
    postformat(string) {
      return string.replace(/,/g, "،");
    },
    meridiem: (hour) => {
      // https://github.com/iamkun/dayjs/pull/2717#issuecomment-2868626450
      return hour < 12 ? "ص" : "م";
    },
  });
}

function updateDayjsLocale(language) {
  const locale = getLocale(language);

  try {
    if (locale !== "en") {
      require(`dayjs/locale/${locale}.js`);
    }
    dayjs.locale(locale);
  } catch (e) {
    console.warn(`Could not set day.js locale to ${locale}`);
    dayjs.locale("en");
  }
}

function getLocale(language = "") {
  switch (language) {
    case "zh":
    case "zh-Hans":
      return "zh-cn";
    default:
      return language.toLowerCase();
  }
}

function getStartOfWeekDay(startOfWeekDayName) {
  if (!startOfWeekDayName) {
    return;
  }

  const startOfWeekDayNumber = DAY_OF_WEEK_OPTIONS.findIndex(
    ({ id }) => id === startOfWeekDayName,
  );
  if (startOfWeekDayNumber === -1) {
    return;
  }

  return startOfWeekDayNumber;
}

// we delete msgid property since it's redundant, but have to add it back in to
// make ttag happy
function addMsgIds(translationsObject) {
  const msgs = translationsObject.translations[""];
  const locale = translationsObject.headers?.language;

  // 如果是中文语言，在添加 msgid 之前先确保兜底翻译存在
  if (locale === "zh-CN" || locale === "zh" || locale?.startsWith("zh")) {
    const fallbackTranslations = {
      "Brand Keywords": { msgid: "Brand Keywords", msgstr: ["品牌关键词"] },
      "Query Text": { msgid: "Query Text", msgstr: ["AI问题"] },
      "Task ID": { msgid: "Task ID", msgstr: ["任务ID"] },
      Enabled: { msgid: "Enabled", msgstr: ["启用"] },
      Actions: { msgid: "Actions", msgstr: ["动作"] },
      Yes: { msgid: "Yes", msgstr: ["是"] },
      No: { msgid: "No", msgstr: ["否"] },
      "Geo Tasks": { msgid: "Geo Tasks", msgstr: ["Geo任务"] },
      "Create Geo Task": { msgid: "Create Geo Task", msgstr: ["创建Geo任务"] },
      Execute: { msgid: "Execute", msgstr: ["执行"] },
      GeoTask: { msgid: "GeoTask", msgstr: ["Geo任务"] },
      "Create a new geo task": {
        msgid: "Create a new geo task",
        msgstr: ["创建新的Geo任务"],
      },
    };

    for (const [key, value] of Object.entries(fallbackTranslations)) {
      if (!(key in msgs)) {
        // eslint-disable-next-line no-console
        console.log(`[i18n] addMsgIds - Adding fallback for "${key}"`);
        msgs[key] = value;
      }
    }
  }

  let brandKeywordsFound = false;
  let queryTextFound = false;
  let categoryFound = false;

  for (const msgid in msgs) {
    if (msgs[msgid].msgid === undefined) {
      msgs[msgid].msgid = msgid;
    }
    if (msgid === "Brand Keywords") {
      brandKeywordsFound = true;
      // eslint-disable-next-line no-console
      console.log(`[i18n] addMsgIds - Found "Brand Keywords":`, msgs[msgid]);
    }
    if (msgid === "Query Text") {
      queryTextFound = true;
      // eslint-disable-next-line no-console
      console.log(`[i18n] addMsgIds - Found "Query Text":`, msgs[msgid]);
    }
    if (msgid === "Task ID") {
      // eslint-disable-next-line no-console
      console.log(`[i18n] addMsgIds - Found "Task ID":`, msgs[msgid]);
    }
    if (msgid === "Category") {
      categoryFound = true;
      // eslint-disable-next-line no-console
      console.log(`[i18n] addMsgIds - Found "Category":`, msgs[msgid]);
    }
  }

  // eslint-disable-next-line no-console
  console.log(
    `[i18n] addMsgIds - Brand Keywords: ${brandKeywordsFound}, Query Text: ${queryTextFound}, Category: ${categoryFound}`,
  );
}

// Runs `f` with the current language for ttag set to the instance (site) locale rather than the user locale, then
// restores the user locale. This can be used for translating specific strings into the instance language; e.g. for
// parameter values in dashboard text cards that should be translated the same for all users viewing the dashboard.
export function withInstanceLanguage(f) {
  if (window.MetabaseSiteLocalization) {
    setLanguage(window.MetabaseSiteLocalization);
  }
  try {
    return f();
  } finally {
    if (window.MetabaseUserLocalization) {
      setLanguage(window.MetabaseUserLocalization);
    }
  }
}

export function siteLocale() {
  if (window.MetabaseSiteLocalization) {
    return window.MetabaseSiteLocalization.headers.language;
  }
}

// register site locale with ttag, if needed later
if (window.MetabaseSiteLocalization) {
  const translationsObject = window.MetabaseSiteLocalization;
  const locale = translationsObject.headers.language;
  addMsgIds(translationsObject);
  addLocale(locale, translationsObject);
}

// set the initial localization to user locale
if (window.MetabaseUserLocalization) {
  setLocalization(window.MetabaseUserLocalization);
}

/**
 * In static embeddings/public links, there is no user locale, since there is no user in static embeddings/public links.
 * But we reset the locale to the site locale when `withInstanceLanguage` is called. This breaks static embeddings/public links
 * since they don't have a user locale. So this function is for them to set the locale from a URL hash as the user locale,
 * then the translation on some part of FE still works even after `withInstanceLanguage` is called.
 *
 * @param {object} translationsObject A translated object with the same structure as the one produced in `loadLocalization` function.
 */
export function setUserLocale(translationsObject) {
  if (!isEmbeddingSdk()) {
    window.MetabaseUserLocalization = translationsObject;
  }
}
