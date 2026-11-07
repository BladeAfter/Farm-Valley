import n0 from "./common.json";
import n1 from "./animals.json";
import n2 from "./errors.json";
import n3 from "./farm.json";
import n4 from "./production.json";
import n5 from "./inventory.json";
import n6 from "./items.json";
import n7 from "./notifications.json";
import n8 from "./orders.json";
import n9 from "./shop.json";
import n10 from "./tutorial.json";
export default Object.assign({},
Object.fromEntries(Object.entries(n0).map(([key,value])=>["common."+key,value])),
Object.fromEntries(Object.entries(n1).map(([key,value])=>["animals."+key,value])),
Object.fromEntries(Object.entries(n2).map(([key,value])=>["errors."+key,value])),
Object.fromEntries(Object.entries(n3).map(([key,value])=>["farm."+key,value])),
Object.fromEntries(Object.entries(n4).map(([key,value])=>["production."+key,value])),
Object.fromEntries(Object.entries(n5).map(([key,value])=>["inventory."+key,value])),
Object.fromEntries(Object.entries(n6).map(([key,value])=>["items."+key,value])),
Object.fromEntries(Object.entries(n7).map(([key,value])=>["notifications."+key,value])),
Object.fromEntries(Object.entries(n8).map(([key,value])=>["orders."+key,value])),
Object.fromEntries(Object.entries(n9).map(([key,value])=>["shop."+key,value])),
Object.fromEntries(Object.entries(n10).map(([key,value])=>["tutorial."+key,value])));
