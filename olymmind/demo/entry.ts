import { createEngine } from "../src/lib/engine";
import { RULES_WEB, scaleRules } from "../src/lib/rules";
import { buildLocalPlan } from "../src/lib/localplan";
import { ROUND_LABEL, ROUND_ORDER, ROUND_RULE_TEXT, CATEGORY_LABEL } from "../src/lib/types";

(globalThis as any).Olym = { createEngine, RULES_WEB, scaleRules, buildPlan: buildLocalPlan, ROUND_LABEL, ROUND_ORDER, ROUND_RULE_TEXT, CATEGORY_LABEL };
