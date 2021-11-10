(function() {
  var template = Handlebars.template, templates = Handlebars.templates = Handlebars.templates || {};
templates['popup'] = template({"1":function(container,depth0,helpers,partials,data) {
    var helper, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <h2>Error</h2>\r\n    "
    + container.escapeExpression(((helper = (helper = lookupProperty(helpers,"error") || (depth0 != null ? lookupProperty(depth0,"error") : depth0)) != null ? helper : container.hooks.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : (container.nullContext || {}),{"name":"error","hash":{},"data":data,"loc":{"start":{"line":3,"column":4},"end":{"line":3,"column":13}}}) : helper)))
    + "\r\n";
},"3":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "    <h2>Brand Buster</h2>\r\n"
    + ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"num_products") : depth0),{"name":"if","hash":{},"fn":container.program(4, data, 0),"inverse":container.program(7, data, 0),"data":data,"loc":{"start":{"line":6,"column":4},"end":{"line":19,"column":11}}})) != null ? stack1 : "");
},"4":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "        <p>Found Amazon brands and exclusive products on the page.</p>\r\n        <p>"
    + alias4(((helper = (helper = lookupProperty(helpers,"num_on_page") || (depth0 != null ? lookupProperty(depth0,"num_on_page") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"num_on_page","hash":{},"data":data,"loc":{"start":{"line":8,"column":11},"end":{"line":8,"column":26}}}) : helper)))
    + " products total. "
    + alias4(((helper = (helper = lookupProperty(helpers,"num_products") || (depth0 != null ? lookupProperty(depth0,"num_products") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"num_products","hash":{},"data":data,"loc":{"start":{"line":8,"column":43},"end":{"line":8,"column":59}}}) : helper)))
    + " are Amazon.</p>\r\n        <ol>\r\n"
    + ((stack1 = lookupProperty(helpers,"each").call(alias1,(depth0 != null ? lookupProperty(depth0,"products") : depth0),{"name":"each","hash":{},"fn":container.program(5, data, 0),"inverse":container.noop,"data":data,"loc":{"start":{"line":10,"column":12},"end":{"line":15,"column":21}}})) != null ? stack1 : "")
    + "        </ol>\r\n";
},"5":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : (container.nullContext || {}), alias2=container.hooks.helperMissing, alias3="function", alias4=container.escapeExpression, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return "                <li>\r\n                    <a href=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"link") || (depth0 != null ? lookupProperty(depth0,"link") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"link","hash":{},"data":data,"loc":{"start":{"line":12,"column":29},"end":{"line":12,"column":37}}}) : helper)))
    + "\">"
    + alias4(((helper = (helper = lookupProperty(helpers,"title") || (depth0 != null ? lookupProperty(depth0,"title") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"title","hash":{},"data":data,"loc":{"start":{"line":12,"column":39},"end":{"line":12,"column":48}}}) : helper)))
    + "</a> ("
    + alias4(((helper = (helper = lookupProperty(helpers,"method") || (depth0 != null ? lookupProperty(depth0,"method") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"method","hash":{},"data":data,"loc":{"start":{"line":12,"column":54},"end":{"line":12,"column":64}}}) : helper)))
    + ")<br>\r\n                    <img src=\""
    + alias4(((helper = (helper = lookupProperty(helpers,"src") || (depth0 != null ? lookupProperty(depth0,"src") : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"src","hash":{},"data":data,"loc":{"start":{"line":13,"column":30},"end":{"line":13,"column":37}}}) : helper)))
    + "\" style=\"width:100px;\"/>\r\n                </li>\r\n";
},"7":function(container,depth0,helpers,partials,data) {
    return "        <p>Didn't find any Amazon brands or exclusive products on the page.</p>\r\n";
},"compiler":[8,">= 4.3.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, lookupProperty = container.lookupProperty || function(parent, propertyName) {
        if (Object.prototype.hasOwnProperty.call(parent, propertyName)) {
          return parent[propertyName];
        }
        return undefined
    };

  return ((stack1 = lookupProperty(helpers,"if").call(depth0 != null ? depth0 : (container.nullContext || {}),(depth0 != null ? lookupProperty(depth0,"error") : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.program(3, data, 0),"data":data,"loc":{"start":{"line":1,"column":0},"end":{"line":20,"column":7}}})) != null ? stack1 : "")
    + "<p class=\"utility-links\">\r\n    <a href=\"#\" onclick=\"clear_storage()\">Clear Local Storage</a> | \r\n    <a href=\"#\" onclick=\"log_storage()\">Log Local Storage</a>\r\n</p>";
},"useData":true});
})();