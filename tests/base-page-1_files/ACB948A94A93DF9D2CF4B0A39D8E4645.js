/*  Prototype JavaScript framework, version 1.7
 *  (c) 2005-2010 Sam Stephenson
 *
 *  Prototype is freely distributable under the terms of an MIT-style license.
 *  For details, see the Prototype web site: http://www.prototypejs.org/
 *
 *--------------------------------------------------------------------------*/

var Prototype = {

  Version: '1.7',

  Browser: (function(){
    var ua = navigator.userAgent;
    var isOpera = Object.prototype.toString.call(window.opera) == '[object Opera]';
    return {
      IE:             !!window.attachEvent && !isOpera,
      Opera:          isOpera,
      WebKit:         ua.indexOf('AppleWebKit/') > -1,
      Gecko:          ua.indexOf('Gecko') > -1 && ua.indexOf('KHTML') === -1,
      MobileSafari:   /Apple.*Mobile/.test(ua)
    }
  })(),

  BrowserFeatures: {
    XPath: !!document.evaluate,

    SelectorsAPI: !!document.querySelector,

    ElementExtensions: (function() {
      var constructor = window.Element || window.HTMLElement;
      return !!(constructor && constructor.prototype);
    })(),
    SpecificElementExtensions: (function() {
      if (typeof window.HTMLDivElement !== 'undefined')
        return true;

      var div = document.createElement('div'),
          form = document.createElement('form'),
          isSupported = false;

      if (div['__proto__'] && (div['__proto__'] !== form['__proto__'])) {
        isSupported = true;
      }

      div = form = null;

      return isSupported;
    })()
  },

  ScriptFragment: '<script[^>]*>([\\S\\s]*?)<\/script>',
  JSONFilter: /^\/\*-secure-([\s\S]*)\*\/\s*$/,

  emptyFunction: function() { },

  K: function(x) { return x }
};

if (Prototype.Browser.MobileSafari)
  Prototype.BrowserFeatures.SpecificElementExtensions = false;


var Abstract = { };


var Try = {
  these: function() {
    var returnValue;

    for (var i = 0, length = arguments.length; i < length; i++) {
      var lambda = arguments[i];
      try {
        returnValue = lambda();
        break;
      } catch (e) { }
    }

    return returnValue;
  }
};

/* Based on Alex Arnell's inheritance implementation. */

var Class = (function() {

  var IS_DONTENUM_BUGGY = (function(){
    for (var p in { toString: 1 }) {
      if (p === 'toString') return false;
    }
    return true;
  })();

  function subclass() {};
  function create() {
    var parent = null, properties = $A(arguments);
    if (Object.isFunction(properties[0]))
      parent = properties.shift();

    function klass() {
      this.initialize.apply(this, arguments);
    }

    Object.extend(klass, Class.Methods);
    klass.superclass = parent;
    klass.subclasses = [];

    if (parent) {
      subclass.prototype = parent.prototype;
      klass.prototype = new subclass;
      parent.subclasses.push(klass);
    }

    for (var i = 0, length = properties.length; i < length; i++)
      klass.addMethods(properties[i]);

    if (!klass.prototype.initialize)
      klass.prototype.initialize = Prototype.emptyFunction;

    klass.prototype.constructor = klass;
    return klass;
  }

  function addMethods(source) {
    var ancestor   = this.superclass && this.superclass.prototype,
        properties = Object.keys(source);

    if (IS_DONTENUM_BUGGY) {
      if (source.toString != Object.prototype.toString)
        properties.push("toString");
      if (source.valueOf != Object.prototype.valueOf)
        properties.push("valueOf");
    }

    for (var i = 0, length = properties.length; i < length; i++) {
      var property = properties[i], value = source[property];
      if (ancestor && Object.isFunction(value) &&
          value.argumentNames()[0] == "$super") {
        var method = value;
        value = (function(m) {
          return function() { return ancestor[m].apply(this, arguments); };
        })(property).wrap(method);

        value.valueOf = method.valueOf.bind(method);
        value.toString = method.toString.bind(method);
      }
      this.prototype[property] = value;
    }

    return this;
  }

  return {
    create: create,
    Methods: {
      addMethods: addMethods
    }
  };
})();
(function() {

  var _toString = Object.prototype.toString,
      NULL_TYPE = 'Null',
      UNDEFINED_TYPE = 'Undefined',
      BOOLEAN_TYPE = 'Boolean',
      NUMBER_TYPE = 'Number',
      STRING_TYPE = 'String',
      OBJECT_TYPE = 'Object',
      FUNCTION_CLASS = '[object Function]',
      BOOLEAN_CLASS = '[object Boolean]',
      NUMBER_CLASS = '[object Number]',
      STRING_CLASS = '[object String]',
      ARRAY_CLASS = '[object Array]',
      DATE_CLASS = '[object Date]',
      NATIVE_JSON_STRINGIFY_SUPPORT = window.JSON &&
        typeof JSON.stringify === 'function' &&
        JSON.stringify(0) === '0' &&
        typeof JSON.stringify(Prototype.K) === 'undefined';

  function Type(o) {
    switch(o) {
      case null: return NULL_TYPE;
      case (void 0): return UNDEFINED_TYPE;
    }
    var type = typeof o;
    switch(type) {
      case 'boolean': return BOOLEAN_TYPE;
      case 'number':  return NUMBER_TYPE;
      case 'string':  return STRING_TYPE;
    }
    return OBJECT_TYPE;
  }

  function extend(destination, source) {
    for (var property in source)
      destination[property] = source[property];
    return destination;
  }

  function inspect(object) {
    try {
      if (isUndefined(object)) return 'undefined';
      if (object === null) return 'null';
      return object.inspect ? object.inspect() : String(object);
    } catch (e) {
      if (e instanceof RangeError) return '...';
      throw e;
    }
  }

  function toJSON(value) {
    return Str('', { '': value }, []);
  }

  function Str(key, holder, stack) {
    var value = holder[key],
        type = typeof value;

    if (Type(value) === OBJECT_TYPE && typeof value.toJSON === 'function') {
      value = value.toJSON(key);
    }

    var _class = _toString.call(value);

    switch (_class) {
      case NUMBER_CLASS:
      case BOOLEAN_CLASS:
      case STRING_CLASS:
        value = value.valueOf();
    }

    switch (value) {
      case null: return 'null';
      case true: return 'true';
      case false: return 'false';
    }

    type = typeof value;
    switch (type) {
      case 'string':
        return value.inspect(true);
      case 'number':
        return isFinite(value) ? String(value) : 'null';
      case 'object':

        for (var i = 0, length = stack.length; i < length; i++) {
          if (stack[i] === value) { throw new TypeError(); }
        }
        stack.push(value);

        var partial = [];
        if (_class === ARRAY_CLASS) {
          for (var i = 0, length = value.length; i < length; i++) {
            var str = Str(i, value, stack);
            partial.push(typeof str === 'undefined' ? 'null' : str);
          }
          partial = '[' + partial.join(',') + ']';
        } else {
          var keys = Object.keys(value);
          for (var i = 0, length = keys.length; i < length; i++) {
            var key = keys[i], str = Str(key, value, stack);
            if (typeof str !== "undefined") {
               partial.push(key.inspect(true)+ ':' + str);
             }
          }
          partial = '{' + partial.join(',') + '}';
        }
        stack.pop();
        return partial;
    }
  }

  function stringify(object) {
    return JSON.stringify(object);
  }

  function toQueryString(object) {
    return $H(object).toQueryString();
  }

  function toHTML(object) {
    return object && object.toHTML ? object.toHTML() : String.interpret(object);
  }

  function keys(object) {
    if (Type(object) !== OBJECT_TYPE) { throw new TypeError(); }
    var results = [];
    for (var property in object) {
      if (object.hasOwnProperty(property)) {
        results.push(property);
      }
    }
    return results;
  }

  function values(object) {
    var results = [];
    for (var property in object)
      results.push(object[property]);
    return results;
  }

  function clone(object) {
    return extend({ }, object);
  }

  function isElement(object) {
    return !!(object && object.nodeType == 1);
  }

  function isArray(object) {
    return _toString.call(object) === ARRAY_CLASS;
  }

  var hasNativeIsArray = (typeof Array.isArray == 'function')
    && Array.isArray([]) && !Array.isArray({});

  if (hasNativeIsArray) {
    isArray = Array.isArray;
  }

  function isHash(object) {
    return object instanceof Hash;
  }

  function isFunction(object) {
    return _toString.call(object) === FUNCTION_CLASS;
  }

  function isString(object) {
    return _toString.call(object) === STRING_CLASS;
  }

  function isNumber(object) {
    return _toString.call(object) === NUMBER_CLASS;
  }

  function isDate(object) {
    return _toString.call(object) === DATE_CLASS;
  }

  function isUndefined(object) {
    return typeof object === "undefined";
  }

  extend(Object, {
    extend:        extend,
    inspect:       inspect,
    toJSON:        NATIVE_JSON_STRINGIFY_SUPPORT ? stringify : toJSON,
    toJSONEx:      toJSON,  // Leaving this in here to assist in debugging odd stringify issues in IE if we see them again in other contexts.
    toQueryString: toQueryString,
    toHTML:        toHTML,
    keys:          Object.keys || keys,
    values:        values,
    clone:         clone,
    isElement:     isElement,
    isArray:       isArray,
    isHash:        isHash,
    isFunction:    isFunction,
    isString:      isString,
    isNumber:      isNumber,
    isDate:        isDate,
    isUndefined:   isUndefined
  });
})();
Object.extend(Function.prototype, (function() {
  var slice = Array.prototype.slice;

  function update(array, args) {
    var arrayLength = array.length, length = args.length;
    while (length--) array[arrayLength + length] = args[length];
    return array;
  }

  function merge(array, args) {
    array = slice.call(array, 0);
    return update(array, args);
  }

  function argumentNames() {
    var names = this.toString().match(/^[\s\(]*function[^(]*\(([^)]*)\)/)[1]
      .replace(/\/\/.*?[\r\n]|\/\*(?:.|[\r\n])*?\*\//g, '')
      .replace(/\s+/g, '').split(',');
    return names.length == 1 && !names[0] ? [] : names;
  }

  function bind(context) {
    if (arguments.length < 2 && Object.isUndefined(arguments[0])) return this;
    var __method = this, args = slice.call(arguments, 1);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(context, a);
    }
  }

  function bindAsEventListener(context) {
    var __method = this, args = slice.call(arguments, 1);
    return function(event) {
      var a = update([event || window.event], args);
      return __method.apply(context, a);
    }
  }

  function curry() {
    if (!arguments.length) return this;
    var __method = this, args = slice.call(arguments, 0);
    return function() {
      var a = merge(args, arguments);
      return __method.apply(this, a);
    }
  }

  function delay(timeout) {
    var __method = this, args = slice.call(arguments, 1);
    timeout = timeout * 1000;
    return window.setTimeout(function() {
      return __method.apply(__method, args);
    }, timeout);
  }

  function defer() {
    var args = update([0.01], arguments);
    return this.delay.apply(this, args);
  }

  function wrap(wrapper) {
    var __method = this;
    return function() {
      var a = update([__method.bind(this)], arguments);
      return wrapper.apply(this, a);
    }
  }

  function methodize() {
    if (this._methodized) return this._methodized;
    var __method = this;
    return this._methodized = function() {
      var a = update([this], arguments);
      return __method.apply(null, a);
    };
  }

  return {
    argumentNames:       argumentNames,
    bind:                bind,
    bindAsEventListener: bindAsEventListener,
    curry:               curry,
    delay:               delay,
    defer:               defer,
    wrap:                wrap,
    methodize:           methodize
  }
})());



(function(proto) {


  function toISOString() {
    return this.getUTCFullYear() + '-' +
      (this.getUTCMonth() + 1).toPaddedString(2) + '-' +
      this.getUTCDate().toPaddedString(2) + 'T' +
      this.getUTCHours().toPaddedString(2) + ':' +
      this.getUTCMinutes().toPaddedString(2) + ':' +
      this.getUTCSeconds().toPaddedString(2) + 'Z';
  }


  function toJSON() {
    return this.toISOString();
  }

  if (!proto.toISOString) proto.toISOString = toISOString;
  if (!proto.toJSON) proto.toJSON = toJSON;

})(Date.prototype);


RegExp.prototype.match = RegExp.prototype.test;

RegExp.escape = function(str) {
  return String(str).replace(/([.*+?^=!:${}()|[\]\/\\])/g, '\\$1');
};
var PeriodicalExecuter = Class.create({
  initialize: function(callback, frequency) {
    this.callback = callback;
    this.frequency = frequency;
    this.currentlyExecuting = false;

    this.registerCallback();
  },

  registerCallback: function() {
    this.timer = setInterval(this.onTimerEvent.bind(this), this.frequency * 1000);
  },

  execute: function() {
    this.callback(this);
  },

  stop: function() {
    if (!this.timer) return;
    clearInterval(this.timer);
    this.timer = null;
  },

  onTimerEvent: function() {
    if (!this.currentlyExecuting) {
      try {
        this.currentlyExecuting = true;
        this.execute();
        this.currentlyExecuting = false;
      } catch(e) {
        this.currentlyExecuting = false;
        throw e;
      }
    }
  }
});
Object.extend(String, {
  interpret: function(value) {
    return value == null ? '' : String(value);
  },
  specialChar: {
    '\b': '\\b',
    '\t': '\\t',
    '\n': '\\n',
    '\f': '\\f',
    '\r': '\\r',
    '\\': '\\\\'
  }
});

Object.extend(String.prototype, (function() {
  var NATIVE_JSON_PARSE_SUPPORT = window.JSON &&
    typeof JSON.parse === 'function' &&
    JSON.parse('{"test": true}').test;

  function prepareReplacement(replacement) {
    if (Object.isFunction(replacement)) return replacement;
    var template = new Template(replacement);
    return function(match) { return template.evaluate(match) };
  }

  function gsub(pattern, replacement) {
    var result = '', source = this, match;
    replacement = prepareReplacement(replacement);

    if (Object.isString(pattern))
      pattern = RegExp.escape(pattern);

    if (!(pattern.length || pattern.source)) {
      replacement = replacement('');
      return replacement + source.split('').join(replacement) + replacement;
    }

    while (source.length > 0) {
      if (match = source.match(pattern)) {
        result += source.slice(0, match.index);
        result += String.interpret(replacement(match));
        source  = source.slice(match.index + match[0].length);
      } else {
        result += source, source = '';
      }
    }
    return result;
  }

  function sub(pattern, replacement, count) {
    replacement = prepareReplacement(replacement);
    count = Object.isUndefined(count) ? 1 : count;

    return this.gsub(pattern, function(match) {
      if (--count < 0) return match[0];
      return replacement(match);
    });
  }

  function scan(pattern, iterator) {
    this.gsub(pattern, iterator);
    return String(this);
  }

  function truncate(length, truncation) {
    length = length || 30;
    truncation = Object.isUndefined(truncation) ? '...' : truncation;
    return this.length > length ?
      this.slice(0, length - truncation.length) + truncation : String(this);
  }

  function strip() {
    return this.replace(/^\s+/, '').replace(/\s+$/, '');
  }

  function stripTags() {
    return this.replace(/<\w+(\s+("[^"]*"|'[^']*'|[^>])+)?>|<\/\w+>/gi, '');
  }

  function stripScripts() {
    return this.replace(new RegExp(Prototype.ScriptFragment, 'img'), '');
  }

  function extractScripts() {
    // NOTE: The original code here extracted scripts with a regex - that worked well-enough except it included scripts inside
    // comments.  An attempt was made to remove comments via a regex but (a) that caused chrome to churn 100% cpu and effectively crash sometimes
    // and (b) extract html comments via a regex is not actually possible to do 100% safely.
    // Instead, let the browser do the work for us- create an element out of this html but DO NOT ADD IT to the dom so it is never actually rendered.
    // Then just find all the scripts in that element.  If any were inside comments then they will already be properly excluded.
    var temp = document.createElement('div');
    temp.innerHTML = this;
    var scripts = temp.getElementsByTagName('script');
    if (scripts.length > 0)
    {
      var rawScripts = [];
      for (var i=0;i<scripts.length;i++)
      {
        rawScripts[i] = scripts[i].innerHTML;
      }
      return rawScripts;
    }
    return [];
  }

  function evalScripts() {
    return this.extractScripts().map(function(script) { return eval(script) });
  }

  function escapeHTML() {
    return this.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  function unescapeHTML() {
    return this.stripTags().replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&amp;/g,'&');
  }


  function toQueryParams(separator) {
    var match = this.strip().match(/([^?#]*)(#.*)?$/);
    if (!match) return { };

    return match[1].split(separator || '&').inject({ }, function(hash, pair) {
      if ((pair = pair.split('='))[0]) {
        var key = decodeURIComponent(pair.shift()),
            value = pair.length > 1 ? pair.join('=') : pair[0];

        if (value != undefined) value = decodeURIComponent(value);

        if (key in hash) {
          if (!Object.isArray(hash[key])) hash[key] = [hash[key]];
          hash[key].push(value);
        }
        else hash[key] = value;
      }
      return hash;
    });
  }

  function toArray() {
    return this.split('');
  }

  function succ() {
    return this.slice(0, this.length - 1) +
      String.fromCharCode(this.charCodeAt(this.length - 1) + 1);
  }

  function times(count) {
    return count < 1 ? '' : new Array(count + 1).join(this);
  }

  function camelize() {
    return this.replace(/-+(.)?/g, function(match, chr) {
      return chr ? chr.toUpperCase() : '';
    });
  }

  function capitalize() {
    return this.charAt(0).toUpperCase() + this.substring(1).toLowerCase();
  }

  function underscore() {
    return this.replace(/::/g, '/')
               .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
               .replace(/([a-z\d])([A-Z])/g, '$1_$2')
               .replace(/-/g, '_')
               .toLowerCase();
  }

  function dasherize() {
    return this.replace(/_/g, '-');
  }

  function inspect(useDoubleQuotes) {
    var escapedString = this.replace(/[\x00-\x1f\\]/g, function(character) {
      if (character in String.specialChar) {
        return String.specialChar[character];
      }
      return '\\u00' + character.charCodeAt().toPaddedString(2, 16);
    });
    if (useDoubleQuotes) return '"' + escapedString.replace(/"/g, '\\"') + '"';
    return "'" + escapedString.replace(/'/g, '\\\'') + "'";
  }

  function unfilterJSON(filter) {
    return this.replace(filter || Prototype.JSONFilter, '$1');
  }

  function isJSON() {
    var str = this;
    if (str.blank()) return false;
    str = str.replace(/\\(?:["\\\/bfnrt]|u[0-9a-fA-F]{4})/g, '@');
    str = str.replace(/"[^"\\\n\r]*"|true|false|null|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?/g, ']');
    str = str.replace(/(?:^|:|,)(?:\s*\[)+/g, '');
    return (/^[\],:{}\s]*$/).test(str);
  }

  function evalJSON(sanitize) {
    var json = this.unfilterJSON(),
        cx = /[\u0000\u00ad\u0600-\u0604\u070f\u17b4\u17b5\u200c-\u200f\u2028-\u202f\u2060-\u206f\ufeff\ufff0-\uffff]/g;
    if (cx.test(json)) {
      json = json.replace(cx, function (a) {
        return '\\u' + ('0000' + a.charCodeAt(0).toString(16)).slice(-4);
      });
    }
    try {
      if (!sanitize || json.isJSON()) return eval('(' + json + ')');
    } catch (e) { }
    throw new SyntaxError('Badly formed JSON string: ' + this.inspect());
  }

  function parseJSON() {
    var json = this.unfilterJSON();
    return JSON.parse(json);
  }

  function include(pattern) {
    return this.indexOf(pattern) > -1;
  }

  function startsWith(pattern) {
    return this.lastIndexOf(pattern, 0) === 0;
  }

  function endsWith(pattern) {
    var d = this.length - pattern.length;
    return d >= 0 && this.indexOf(pattern, d) === d;
  }

  function empty() {
    return this == '';
  }

  function blank() {
    return /^\s*$/.test(this);
  }

  function interpolate(object, pattern) {
    return new Template(this, pattern).evaluate(object);
  }

  return {
    gsub:           gsub,
    sub:            sub,
    scan:           scan,
    truncate:       truncate,
    strip:          String.prototype.trim || strip,
    stripTags:      stripTags,
    stripScripts:   stripScripts,
    extractScripts: extractScripts,
    evalScripts:    evalScripts,
    escapeHTML:     escapeHTML,
    unescapeHTML:   unescapeHTML,
    toQueryParams:  toQueryParams,
    parseQuery:     toQueryParams,
    toArray:        toArray,
    succ:           succ,
    times:          times,
    camelize:       camelize,
    capitalize:     capitalize,
    underscore:     underscore,
    dasherize:      dasherize,
    inspect:        inspect,
    unfilterJSON:   unfilterJSON,
    isJSON:         isJSON,
    evalJSON:       NATIVE_JSON_PARSE_SUPPORT ? parseJSON : evalJSON,
    include:        include,
    startsWith:     startsWith,
    endsWith:       endsWith,
    empty:          empty,
    blank:          blank,
    interpolate:    interpolate
  };
})());

var Template = Class.create({
  initialize: function(template, pattern) {
    this.template = template.toString();
    this.pattern = pattern || Template.Pattern;
  },

  evaluate: function(object) {
    if (object && Object.isFunction(object.toTemplateReplacements))
      object = object.toTemplateReplacements();

    return this.template.gsub(this.pattern, function(match) {
      if (object == null) return (match[1] + '');

      var before = match[1] || '';
      if (before == '\\') return match[2];

      var ctx = object, expr = match[3],
          pattern = /^([^.[]+|\[((?:.*?[^\\])?)\])(\.|\[|$)/;

      match = pattern.exec(expr);
      if (match == null) return before;

      while (match != null) {
        var comp = match[1].startsWith('[') ? match[2].replace(/\\\\]/g, ']') : match[1];
        ctx = ctx[comp];
        if (null == ctx || '' == match[3]) break;
        expr = expr.substring('[' == match[3] ? match[1].length : match[0].length);
        match = pattern.exec(expr);
      }

      return before + String.interpret(ctx);
    });
  }
});
Template.Pattern = /(^|.|\r|\n)(#\{(.*?)\})/;

var $break = { };

var Enumerable = (function() {
  function each(iterator, context) {
    var index = 0;
    try {
      this._each(function(value) {
        iterator.call(context, value, index++);
      });
    } catch (e) {
      if (e != $break) throw e;
    }
    return this;
  }

  function eachSlice(number, iterator, context) {
    var index = -number, slices = [], array = this.toArray();
    if (number < 1) return array;
    while ((index += number) < array.length)
      slices.push(array.slice(index, index+number));
    return slices.collect(iterator, context);
  }

  function all(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = true;
    this.each(function(value, index) {
      result = result && !!iterator.call(context, value, index);
      if (!result) throw $break;
    });
    return result;
  }

  function any(iterator, context) {
    iterator = iterator || Prototype.K;
    var result = false;
    this.each(function(value, index) {
      if (result = !!iterator.call(context, value, index))
        throw $break;
    });
    return result;
  }

  function collect(iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];
    this.each(function(value, index) {
      results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function detect(iterator, context) {
    var result;
    this.each(function(value, index) {
      if (iterator.call(context, value, index)) {
        result = value;
        throw $break;
      }
    });
    return result;
  }

  function findAll(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function grep(filter, iterator, context) {
    iterator = iterator || Prototype.K;
    var results = [];

    if (Object.isString(filter))
      filter = new RegExp(RegExp.escape(filter));

    this.each(function(value, index) {
      if (filter.match(value))
        results.push(iterator.call(context, value, index));
    });
    return results;
  }

  function include(object) {
    if (Object.isFunction(this.indexOf))
      if (this.indexOf(object) != -1) return true;

    var found = false;
    this.each(function(value) {
      if (value == object) {
        found = true;
        throw $break;
      }
    });
    return found;
  }

  function inGroupsOf(number, fillWith) {
    fillWith = Object.isUndefined(fillWith) ? null : fillWith;
    return this.eachSlice(number, function(slice) {
      while(slice.length < number) slice.push(fillWith);
      return slice;
    });
  }

  function inject(memo, iterator, context) {
    this.each(function(value, index) {
      memo = iterator.call(context, memo, value, index);
    });
    return memo;
  }

  function invoke(method) {
    var args = $A(arguments).slice(1);
    return this.map(function(value) {
      return value[method].apply(value, args);
    });
  }

  function max(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value >= result)
        result = value;
    });
    return result;
  }

  function min(iterator, context) {
    iterator = iterator || Prototype.K;
    var result;
    this.each(function(value, index) {
      value = iterator.call(context, value, index);
      if (result == null || value < result)
        result = value;
    });
    return result;
  }

  function partition(iterator, context) {
    iterator = iterator || Prototype.K;
    var trues = [], falses = [];
    this.each(function(value, index) {
      (iterator.call(context, value, index) ?
        trues : falses).push(value);
    });
    return [trues, falses];
  }

  function pluck(property) {
    var results = [];
    this.each(function(value) {
      results.push(value[property]);
    });
    return results;
  }

  function reject(iterator, context) {
    var results = [];
    this.each(function(value, index) {
      if (!iterator.call(context, value, index))
        results.push(value);
    });
    return results;
  }

  function sortBy(iterator, context) {
    return this.map(function(value, index) {
      return {
        value: value,
        criteria: iterator.call(context, value, index)
      };
    }).sort(function(left, right) {
      var a = left.criteria, b = right.criteria;
      return a < b ? -1 : a > b ? 1 : 0;
    }).pluck('value');
  }

  function toArray() {
    return this.map();
  }

  function zip() {
    var iterator = Prototype.K, args = $A(arguments);
    if (Object.isFunction(args.last()))
      iterator = args.pop();

    var collections = [this].concat(args).map($A);
    return this.map(function(value, index) {
      return iterator(collections.pluck(index));
    });
  }

  function size() {
    return this.toArray().length;
  }

  function inspect() {
    return '#<Enumerable:' + this.toArray().inspect() + '>';
  }









  return {
    each:       each,
    eachSlice:  eachSlice,
    all:        all,
    every:      all,
    any:        any,
    some:       any,
    collect:    collect,
    map:        collect,
    detect:     detect,
    findAll:    findAll,
    select:     findAll,
    filter:     findAll,
    grep:       grep,
    include:    include,
    member:     include,
    inGroupsOf: inGroupsOf,
    inject:     inject,
    invoke:     invoke,
    max:        max,
    min:        min,
    partition:  partition,
    pluck:      pluck,
    reject:     reject,
    sortBy:     sortBy,
    toArray:    toArray,
    entries:    toArray,
    zip:        zip,
    size:       size,
    inspect:    inspect,
    find:       detect
  };
})();

function $A(iterable) {
  if (!iterable) return [];
  if ('toArray' in Object(iterable)) return iterable.toArray();
  var length = iterable.length || 0, results = new Array(length);
  while (length--) results[length] = iterable[length];
  return results;
}


function $w(string) {
  if (!Object.isString(string)) return [];
  string = string.strip();
  return string ? string.split(/\s+/) : [];
}

Array.from = $A;


(function() {
  var arrayProto = Array.prototype,
      slice = arrayProto.slice,
      _each = arrayProto.forEach; // use native browser JS 1.6 implementation if available

  function each(iterator, context) {
    for (var i = 0, length = this.length >>> 0; i < length; i++) {
      if (i in this) iterator.call(context, this[i], i, this);
    }
  }
  if (!_each) _each = each;

  function clear() {
    this.length = 0;
    return this;
  }

  function first() {
    return this[0];
  }

  function last() {
    return this[this.length - 1];
  }

  function compact() {
    return this.select(function(value) {
      return value != null;
    });
  }

  function flatten() {
    return this.inject([], function(array, value) {
      if (Object.isArray(value))
        return array.concat(value.flatten());
      array.push(value);
      return array;
    });
  }

  function without() {
    var values = slice.call(arguments, 0);
    return this.select(function(value) {
      return !values.include(value);
    });
  }

  function reverse(inline) {
    return (inline === false ? this.toArray() : this)._reverse();
  }

  function uniq(sorted) {
    return this.inject([], function(array, value, index) {
      if (0 == index || (sorted ? array.last() != value : !array.include(value)))
        array.push(value);
      return array;
    });
  }

  function intersect(array) {
    return this.uniq().findAll(function(item) {
      return array.detect(function(value) { return item === value });
    });
  }


  function clone() {
    return slice.call(this, 0);
  }

  function size() {
    return this.length;
  }

  function inspect() {
    return '[' + this.map(Object.inspect).join(', ') + ']';
  }

  function indexOf(item, i) {
    i || (i = 0);
    var length = this.length;
    if (i < 0) i = length + i;
    for (; i < length; i++)
      if (this[i] === item) return i;
    return -1;
  }

  function lastIndexOf(item, i) {
    i = isNaN(i) ? this.length : (i < 0 ? this.length + i : i) + 1;
    var n = this.slice(0, i).reverse().indexOf(item);
    return (n < 0) ? n : i - n - 1;
  }

  function concat() {
    var array = slice.call(this, 0), item;
    for (var i = 0, length = arguments.length; i < length; i++) {
      item = arguments[i];
      if (Object.isArray(item) && !('callee' in item)) {
        for (var j = 0, arrayLength = item.length; j < arrayLength; j++)
          array.push(item[j]);
      } else {
        array.push(item);
      }
    }
    return array;
  }

  Object.extend(arrayProto, Enumerable);

  if (!arrayProto._reverse)
    arrayProto._reverse = arrayProto.reverse;

  Object.extend(arrayProto, {
    _each:     _each,
    clear:     clear,
    first:     first,
    last:      last,
    compact:   compact,
    flatten:   flatten,
    without:   without,
    reverse:   reverse,
    uniq:      uniq,
    intersect: intersect,
    clone:     clone,
    toArray:   clone,
    size:      size,
    inspect:   inspect
  });

  var CONCAT_ARGUMENTS_BUGGY = (function() {
    return [].concat(arguments)[0][0] !== 1;
  })(1,2)

  if (CONCAT_ARGUMENTS_BUGGY) arrayProto.concat = concat;

  if (!arrayProto.indexOf) arrayProto.indexOf = indexOf;
  if (!arrayProto.lastIndexOf) arrayProto.lastIndexOf = lastIndexOf;
})();
function $H(object) {
  return new Hash(object);
};

var Hash = Class.create(Enumerable, (function() {
  function initialize(object) {
    this._object = Object.isHash(object) ? object.toObject() : Object.clone(object);
  }


  function _each(iterator) {
    for (var key in this._object) {
      var value = this._object[key], pair = [key, value];
      pair.key = key;
      pair.value = value;
      iterator(pair);
    }
  }

  function set(key, value) {
    return this._object[key] = value;
  }

  function get(key) {
    if (this._object[key] !== Object.prototype[key])
      return this._object[key];
  }

  function unset(key) {
    var value = this._object[key];
    delete this._object[key];
    return value;
  }

  function toObject() {
    return Object.clone(this._object);
  }



  function keys() {
    return this.pluck('key');
  }

  function values() {
    return this.pluck('value');
  }

  function index(value) {
    var match = this.detect(function(pair) {
      return pair.value === value;
    });
    return match && match.key;
  }

  function merge(object) {
    return this.clone().update(object);
  }

  function update(object) {
    return new Hash(object).inject(this, function(result, pair) {
      result.set(pair.key, pair.value);
      return result;
    });
  }

  function toQueryPair(key, value) {
    if (Object.isUndefined(value)) return key;
    return key + '=' + encodeURIComponent(String.interpret(value));
  }

  function toQueryString() {
    return this.inject([], function(results, pair) {
      var key = encodeURIComponent(pair.key), values = pair.value;

      if (values && typeof values == 'object') {
        if (Object.isArray(values)) {
          var queryValues = [];
          for (var i = 0, len = values.length, value; i < len; i++) {
            value = values[i];
            queryValues.push(toQueryPair(key, value));
          }
          return results.concat(queryValues);
        }
      } else results.push(toQueryPair(key, values));
      return results;
    }).join('&');
  }

  function inspect() {
    return '#<Hash:{' + this.map(function(pair) {
      return pair.map(Object.inspect).join(': ');
    }).join(', ') + '}>';
  }

  function clone() {
    return new Hash(this);
  }

  return {
    initialize:             initialize,
    _each:                  _each,
    set:                    set,
    get:                    get,
    unset:                  unset,
    toObject:               toObject,
    toTemplateReplacements: toObject,
    keys:                   keys,
    values:                 values,
    index:                  index,
    merge:                  merge,
    update:                 update,
    toQueryString:          toQueryString,
    inspect:                inspect,
    toJSON:                 toObject,
    clone:                  clone
  };
})());

Hash.from = $H;
Object.extend(Number.prototype, (function() {
  function toColorPart() {
    return this.toPaddedString(2, 16);
  }

  function succ() {
    return this + 1;
  }

  function times(iterator, context) {
    $R(0, this, true).each(iterator, context);
    return this;
  }

  function toPaddedString(length, radix) {
    var string = this.toString(radix || 10);
    return '0'.times(length - string.length) + string;
  }

  function abs() {
    return Math.abs(this);
  }

  function round() {
    return Math.round(this);
  }

  function ceil() {
    return Math.ceil(this);
  }

  function floor() {
    return Math.floor(this);
  }

  return {
    toColorPart:    toColorPart,
    succ:           succ,
    times:          times,
    toPaddedString: toPaddedString,
    abs:            abs,
    round:          round,
    ceil:           ceil,
    floor:          floor
  };
})());

function $R(start, end, exclusive) {
  return new ObjectRange(start, end, exclusive);
}

var ObjectRange = Class.create(Enumerable, (function() {
  function initialize(start, end, exclusive) {
    this.start = start;
    this.end = end;
    this.exclusive = exclusive;
  }

  function _each(iterator) {
    var value = this.start;
    while (this.include(value)) {
      iterator(value);
      value = value.succ();
    }
  }

  function include(value) {
    if (value < this.start)
      return false;
    if (this.exclusive)
      return value < this.end;
    return value <= this.end;
  }

  return {
    initialize: initialize,
    _each:      _each,
    include:    include
  };
})());



var Ajax = {
  getTransport: function() {
    return Try.these(
      function() {return new XMLHttpRequest()},
      function() {return new ActiveXObject('Msxml2.XMLHTTP')},
      function() {return new ActiveXObject('Microsoft.XMLHTTP')}
    ) || false;
  },

  activeRequestCount: 0
};

Ajax.Responders = {
  responders: [],

  _each: function(iterator) {
    this.responders._each(iterator);
  },

  register: function(responder) {
    if (!this.include(responder))
      this.responders.push(responder);
  },

  unregister: function(responder) {
    this.responders = this.responders.without(responder);
  },

  dispatch: function(callback, request, transport, json) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        try {
          responder[callback].apply(responder, [request, transport, json]);
        } catch (e) { }
      }
    });
  },

  hasResponder: function( callback ) {
    this.each(function(responder) {
      if (Object.isFunction(responder[callback])) {
        return true;
      }
    });
    return false;
  }
};

Object.extend(Ajax.Responders, Enumerable);

Ajax.Responders.register({
  onCreate:   function() { Ajax.activeRequestCount++ },
  onComplete: function() { Ajax.activeRequestCount-- }
});
Ajax.Base = Class.create({
  initialize: function(options) {
    this.options = {
      method:       'post',
      asynchronous: true,
      contentType:  'application/x-www-form-urlencoded',
      encoding:     'UTF-8',
      parameters:   '',
      evalJSON:     true,
      evalJS:       true
    };
    Object.extend(this.options, options || { });

    this.options.method = this.options.method.toLowerCase();

    if (Object.isHash(this.options.parameters))
        this.options.parameters = this.options.parameters.toObject();
  }
});
Ajax.Request = Class.create(Ajax.Base, {
  _complete: false,

  initialize: function($super, url, options) {
    $super(options);
    this.transport = Ajax.getTransport();
    this.request(url);
  },

  request: function(url) {
    this.url = url;
    this.method = this.options.method;
    var params = Object.isString(this.options.parameters) ?
          this.options.parameters :
          Object.toQueryString(this.options.parameters);

    if (!['get', 'post'].include(this.method)) {
      params += (params ? '&' : '') + "_method=" + this.method;
      this.method = 'post';
    }

    if (params && this.method === 'get') {
      this.url += (this.url.include('?') ? '&' : '?') + params;
    }

    this.parameters = params.toQueryParams();

    try {
      var response = new Ajax.Response(this);
      if (this.options.onCreate) this.options.onCreate(response);
      Ajax.Responders.dispatch('onCreate', this, response);

      this.transport.open(this.method.toUpperCase(), this.url,
        this.options.asynchronous);

      if (this.options.asynchronous) this.respondToReadyState.bind(this).defer(1);

      this.transport.onreadystatechange = this.onStateChange.bind(this);
      this.setRequestHeaders();

      this.body = this.method == 'post' ? (this.options.postBody || params) : null;
      this.transport.send(this.body);

      /* Force Firefox to handle ready state 4 for synchronous requests */
      if (!this.options.asynchronous && this.transport.overrideMimeType)
        this.onStateChange();

    }
    catch (e) {
      this.dispatchException(e);
    }
  },

  onStateChange: function() {
    var readyState = this.transport.readyState;
    if (readyState > 1 && !((readyState == 4) && this._complete))
      this.respondToReadyState(this.transport.readyState);
  },

  setRequestHeaders: function() {
    var headers = {
      'X-Requested-With': 'XMLHttpRequest',
      'X-Prototype-Version': Prototype.Version,
      'Accept': 'text/javascript, text/html, application/xml, text/xml, */*'
    };

    if (this.method == 'post') {
      headers['Content-type'] = this.options.contentType +
        (this.options.encoding ? '; charset=' + this.options.encoding : '');

      /* Force "Connection: close" for older Mozilla browsers to work
       * around a bug where XMLHttpRequest sends an incorrect
       * Content-length header. See Mozilla Bugzilla #246651.
       */
      if (this.transport.overrideMimeType &&
          (navigator.userAgent.match(/Gecko\/(\d{4})/) || [0,2005])[1] < 2005)
            headers['Connection'] = 'close';
    }

    if (typeof this.options.requestHeaders == 'object') {
      var extras = this.options.requestHeaders;

      if (Object.isFunction(extras.push))
        for (var i = 0, length = extras.length; i < length; i += 2)
          headers[extras[i]] = extras[i+1];
      else
        $H(extras).each(function(pair) { headers[pair.key] = pair.value });
    }

    for (var name in headers)
      this.transport.setRequestHeader(name, headers[name]);
  },

  success: function() {
    var status = this.getStatus();
    return !status || (status >= 200 && status < 300) || status == 304;
  },

  getStatus: function() {
    try {
      if (this.transport.status === 1223) return 204;
      return this.transport.status || 0;
    } catch (e) { return 0 }
  },

  respondToReadyState: function(readyState) {
    var state = Ajax.Request.Events[readyState];
    // quite a high number of Interactive events can be generated on some browsers
    // triggering a memory issue in FF3 when building the response object. So if there is no
    // registered listener, quick return
    // see https://bugzilla.mozilla.org/show_bug.cgi?id=453709
    if ( state == 'Interactive' )
    {
      if ( this.notListeningToInteractive )
      {
        if ( this.notListeningToInteractive.value ) return;
      }
      else
      {
        this.notListeningToInteractive = new Object();
        this.notListeningToInteractive.value = ( !this.options['onInteractive'] && !Ajax.Responders.hasResponder( state ) );
        if ( this.notListeningToInteractive.value ) return;
      }
    }
    var response = new Ajax.Response(this);

    if (state == 'Complete') {
      try {
        this._complete = true;
        (this.options['on' + response.status]
         || this.options['on' + (this.success() ? 'Success' : 'Failure')]
         || Prototype.emptyFunction)(response, response.headerJSON);
      } catch (e) {
        this.dispatchException(e);
      }

      var contentType = response.getHeader('Content-type');
      if (this.options.evalJS == 'force'
          || (this.options.evalJS && this.isSameOrigin() && contentType
          && contentType.match(/^\s*(text|application)\/(x-)?(java|ecma)script(;.*)?\s*$/i)))
        this.evalResponse();
    }

    try {
      (this.options['on' + state] || Prototype.emptyFunction)(response, response.headerJSON);
      Ajax.Responders.dispatch('on' + state, this, response, response.headerJSON);
    } catch (e) {
      this.dispatchException(e);
    }

    if (state == 'Complete') {
      this.transport.onreadystatechange = Prototype.emptyFunction;
    }
  },

  isSameOrigin: function() {
    var m = this.url.match(/^\s*https?:\/\/[^\/]*/);
    return !m || (m[0] == '#{protocol}//#{domain}#{port}'.interpolate({
      protocol: location.protocol,
      domain: document.domain,
      port: location.port ? ':' + location.port : ''
    }));
  },

  getHeader: function(name) {
    try {
      return this.transport.getResponseHeader(name) || null;
    } catch (e) { return null; }
  },

  evalResponse: function() {
    try {
      return eval((this.transport.responseText || '').unfilterJSON());
    } catch (e) {
      this.dispatchException(e);
    }
  },

  dispatchException: function(exception) {
    (this.options.onException || Prototype.emptyFunction)(this, exception);
    Ajax.Responders.dispatch('onException', this, exception);
  }
});

Ajax.Request.Events =
  ['Uninitialized', 'Loading', 'Loaded', 'Interactive', 'Complete'];








Ajax.Response = Class.create({
  initialize: function(request){
    this.request = request;
    var transport  = this.transport  = request.transport,
        readyState = this.readyState = transport.readyState;

    if ((readyState > 2 && !Prototype.Browser.IE) || readyState == 4) {
      this.status       = this.getStatus();
      this.statusText   = this.getStatusText();
      this.responseText = String.interpret(transport.responseText);
      this.headerJSON   = this._getHeaderJSON();
    }

    if (readyState == 4) {
      var xml = transport.responseXML;
      this.responseXML  = Object.isUndefined(xml) ? null : xml;
      this.responseJSON = this._getResponseJSON();
    }
  },

  status:      0,

  statusText: '',

  getStatus: Ajax.Request.prototype.getStatus,

  getStatusText: function() {
    try {
      return this.transport.statusText || '';
    } catch (e) { return '' }
  },

  getHeader: Ajax.Request.prototype.getHeader,

  getAllHeaders: function() {
    try {
      return this.getAllResponseHeaders();
    } catch (e) { return null }
  },

  getResponseHeader: function(name) {
    return this.transport.getResponseHeader(name);
  },

  getAllResponseHeaders: function() {
    return this.transport.getAllResponseHeaders();
  },

  _getHeaderJSON: function() {
    var json = this.getHeader('X-JSON');
    if (!json) return null;
    json = decodeURIComponent(escape(json));
    try {
      return json.evalJSON(this.request.options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  },

  _getResponseJSON: function() {
    var options = this.request.options;
    if (!options.evalJSON || (options.evalJSON != 'force' &&
      !(this.getHeader('Content-type') || '').include('application/json')) ||
        this.responseText.blank())
          return null;
    try {
      return this.responseText.evalJSON(options.sanitizeJSON ||
        !this.request.isSameOrigin());
    } catch (e) {
      this.request.dispatchException(e);
    }
  }
});

Ajax.Updater = Class.create(Ajax.Request, {
  initialize: function($super, container, url, options) {
    this.container = {
      success: (container.success || container),
      failure: (container.failure || (container.success ? null : container))
    };

    options = Object.clone(options);
    var onComplete = options.onComplete;
    options.onComplete = (function(response, json) {
      this.updateContent(response.responseText);
      if (Object.isFunction(onComplete)) onComplete(response, json);
    }).bind(this);

    $super(url, options);
  },

  updateContent: function(responseText) {
    var receiver = this.container[this.success() ? 'success' : 'failure'],
        options = this.options;

    if (!options.evalScripts) responseText = responseText.stripScripts();

    if (receiver = $(receiver)) {
      if (options.insertion) {
        if (Object.isString(options.insertion)) {
          var insertion = { }; insertion[options.insertion] = responseText;
          receiver.insert(insertion);
        }
        else options.insertion(receiver, responseText);
      }
      else receiver.update(responseText);
    }
  }
});

Ajax.PeriodicalUpdater = Class.create(Ajax.Base, {
  initialize: function($super, container, url, options) {
    $super(options);
    this.onComplete = this.options.onComplete;

    this.frequency = (this.options.frequency || 2);
    this.decay = (this.options.decay || 1);

    this.updater = { };
    this.container = container;
    this.url = url;

    this.start();
  },

  start: function() {
    this.options.onComplete = this.updateComplete.bind(this);
    this.onTimerEvent();
  },

  stop: function() {
    this.updater.options.onComplete = undefined;
    clearTimeout(this.timer);
    (this.onComplete || Prototype.emptyFunction).apply(this, arguments);
  },

  updateComplete: function(response) {
    if (this.options.decay) {
      this.decay = (response.responseText == this.lastText ?
        this.decay * this.options.decay : 1);

      this.lastText = response.responseText;
    }
    this.timer = this.onTimerEvent.bind(this).delay(this.decay * this.frequency);
  },

  onTimerEvent: function() {
    this.updater = new Ajax.Updater(this.container, this.url, this.options);
  }
});

function $s(element) {
  if (Object.isString(element)) {
    return document.getElementById(element);
  }
  return element;
}

function $(element) {
  if (arguments.length > 1) {
    for (var i = 0, elements = [], length = arguments.length; i < length; i++)
      elements.push($(arguments[i]));
    return elements;
  }
  if (Object.isString(element))
    element = document.getElementById(element);
  return Element.extend(element);
}

if (Prototype.BrowserFeatures.XPath) {
  document._getElementsByXPath = function(expression, parentElement) {
    var results = [];
    var query = document.evaluate(expression, $(parentElement) || document,
      null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null);
    for (var i = 0, length = query.snapshotLength; i < length; i++)
      results.push(Element.extend(query.snapshotItem(i)));
    return results;
  };
}

/*--------------------------------------------------------------------------*/

if (!Node) var Node = { };

if (!Node.ELEMENT_NODE) {
  Object.extend(Node, {
    ELEMENT_NODE: 1,
    ATTRIBUTE_NODE: 2,
    TEXT_NODE: 3,
    CDATA_SECTION_NODE: 4,
    ENTITY_REFERENCE_NODE: 5,
    ENTITY_NODE: 6,
    PROCESSING_INSTRUCTION_NODE: 7,
    COMMENT_NODE: 8,
    DOCUMENT_NODE: 9,
    DOCUMENT_TYPE_NODE: 10,
    DOCUMENT_FRAGMENT_NODE: 11,
    NOTATION_NODE: 12
  });
}



(function(global) {
  function shouldUseCache(tagName, attributes) {
    if (tagName === 'select') return false;
    if ('type' in attributes) return false;
    return true;
  }

  var HAS_EXTENDED_CREATE_ELEMENT_SYNTAX = (function(){
    try {
      var el = document.createElement('<input name="x">');
      return el.tagName.toLowerCase() === 'input' && el.name === 'x';
    }
    catch(err) {
      return false;
    }
  })();

  var element = global.Element;

  global.Element = function(tagName, attributes) {
    attributes = attributes || { };
    tagName = tagName.toLowerCase();
    var cache = Element.cache;

    if (HAS_EXTENDED_CREATE_ELEMENT_SYNTAX && attributes.name) {
      tagName = '<' + tagName + ' name="' + attributes.name + '">';
      delete attributes.name;
      return Element.writeAttribute(document.createElement(tagName), attributes);
    }

    if (!cache[tagName]) cache[tagName] = Element.extend(document.createElement(tagName));

    var node = shouldUseCache(tagName, attributes) ?
     cache[tagName].cloneNode(false) : document.createElement(tagName);

    return Element.writeAttribute(node, attributes);
  };

  Object.extend(global.Element, element || { });
  if (element) global.Element.prototype = element.prototype;

})(this);

Element.idCounter = 1;
Element.cache = { };

Element._purgeElement = function(element) {
  var uid = element._prototypeUID;
  if (uid) {
    Element.stopObserving(element);
    element._prototypeUID = void 0;
    delete Element.Storage[uid];
  }
}

Element.Methods = {
  visible: function(element) {
    return $(element).style.display != 'none';
  },

  toggle: function(element) {
    element = $(element);
    Element[Element.visible(element) ? 'hide' : 'show'](element);
    return element;
  },

  hide: function(element) {
    element = $(element);
    element.style.display = 'none';
    return element;
  },

  show: function(element) {
    element = $(element);
    element.style.display = '';
    return element;
  },

  // only extend the element if it is a string - otherwise we don't need to extend the element
  remove: function(element) {
    if (Object.isString(element)) {
      element = $(element);
    }
    if (element.parentNode) {
        element.parentNode.removeChild(element);
    }
    return element;
  },

  update: (function(){

    var SELECT_ELEMENT_INNERHTML_BUGGY = (function(){
      var el = document.createElement("select"),
          isBuggy = true;
      el.innerHTML = "<option value=\"test\">test</option>";
      if (el.options && el.options[0]) {
        isBuggy = el.options[0].nodeName.toUpperCase() !== "OPTION";
      }
      el = null;
      return isBuggy;
    })();

    var TABLE_ELEMENT_INNERHTML_BUGGY = (function(){
      try {
        var el = document.createElement("table");
        if (el && el.tBodies) {
          el.innerHTML = "<tbody><tr><td>test</td></tr></tbody>";
          var isBuggy = typeof el.tBodies[0] == "undefined";
          el = null;
          return isBuggy;
        }
      } catch (e) {
        return true;
      }
    })();

    var LINK_ELEMENT_INNERHTML_BUGGY = (function() {
      try {
        var el = document.createElement('div');
        el.innerHTML = "<link>";
        var isBuggy = (el.childNodes.length === 0);
        el = null;
        return isBuggy;
      } catch(e) {
        return true;
      }
    })();

    var ANY_INNERHTML_BUGGY = SELECT_ELEMENT_INNERHTML_BUGGY ||
     TABLE_ELEMENT_INNERHTML_BUGGY || LINK_ELEMENT_INNERHTML_BUGGY;

    var SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING = (function () {
      var s = document.createElement("script"),
          isBuggy = false;
      try {
        s.appendChild(document.createTextNode(""));
        isBuggy = !s.firstChild ||
          s.firstChild && s.firstChild.nodeType !== 3;
      } catch (e) {
        isBuggy = true;
      }
      s = null;
      return isBuggy;
    })();


    function update(element, content) {
      element = $(element);
      var purgeElement = Element._purgeElement;

      var descendants = element.getElementsByTagName('*'),
       i = descendants.length;
      while (i--) purgeElement(descendants[i]);

      if (content && content.toElement)
        content = content.toElement();

      if (Object.isElement(content))
        return element.update().insert(content);

      content = Object.toHTML(content);

      var tagName = element.tagName.toUpperCase();

      if (tagName === 'SCRIPT' && SCRIPT_ELEMENT_REJECTS_TEXTNODE_APPENDING) {
        element.text = content;
        return element;
      }

      if (ANY_INNERHTML_BUGGY) {
        if (tagName in Element._insertionTranslations.tags) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          Element._getContentFromAnonymousElement(tagName, content.stripScripts())
            .each(function(node) {
              element.appendChild(node)
            });
        } else if (LINK_ELEMENT_INNERHTML_BUGGY && Object.isString(content) && content.indexOf('<link') > -1) {
          while (element.firstChild) {
            element.removeChild(element.firstChild);
          }
          var nodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts(), true);
          nodes.each(function(node) { element.appendChild(node) });
        }
        else {
          element.innerHTML = content.stripScripts();
        }
      }
      else {
        element.innerHTML = content.stripScripts();
      }

      content.evalScripts.bind(content).defer();
      return element;
    }

    return update;
  })(),

  replace: function(element, content) {
    element = $(element);
    if (content && content.toElement) content = content.toElement();
    else if (!Object.isElement(content)) {
      content = Object.toHTML(content);
      var range = element.ownerDocument.createRange();
      range.selectNode(element);
      content.evalScripts.bind(content).defer();
      content = range.createContextualFragment(content.stripScripts());
    }
    element.parentNode.replaceChild(content, element);
    return element;
  },

  insert: function(element, insertions) {
    element = $(element);

    if (Object.isString(insertions) || Object.isNumber(insertions) ||
        Object.isElement(insertions) || (insertions && (insertions.toElement || insertions.toHTML)))
          insertions = {bottom:insertions};

    var content, insert, tagName, childNodes;

    for (var position in insertions) {
      content  = insertions[position];
      position = position.toLowerCase();
      insert = Element._insertionTranslations[position];

      if (content && content.toElement) content = content.toElement();
      if (Object.isElement(content)) {
        insert(element, content);
        continue;
      }

      content = Object.toHTML(content);

      tagName = ((position == 'before' || position == 'after')
        ? element.parentNode : element).tagName.toUpperCase();

      childNodes = Element._getContentFromAnonymousElement(tagName, content.stripScripts());

      if (position == 'top' || position == 'after') childNodes.reverse();
      childNodes.each(insert.curry(element));

      content.evalScripts.bind(content).defer();
    }

    return element;
  },

  wrap: function(element, wrapper, attributes) {
    element = $(element);
    if (Object.isElement(wrapper))
      $(wrapper).writeAttribute(attributes || { });
    else if (Object.isString(wrapper)) wrapper = new Element(wrapper, attributes);
    else wrapper = new Element('div', wrapper);
    if (element.parentNode)
      element.parentNode.replaceChild(wrapper, element);
    wrapper.appendChild(element);
    return wrapper;
  },

  inspect: function(element) {
    element = $(element);
    var result = '<' + element.tagName.toLowerCase();
    $H({'id': 'id', 'className': 'class'}).each(function(pair) {
      var property = pair.first(),
          attribute = pair.last(),
          value = (element[property] || '').toString();
      if (value) result += ' ' + attribute + '=' + value.inspect(true);
    });
    return result + '>';
  },

  recursivelyCollect: function(element, property, maximumLength) {
    element = $(element);
    maximumLength = maximumLength || -1;
    var elements = [];

    while (element = element[property]) {
      if (element.nodeType == 1)
        elements.push(Element.extend(element));
      if (elements.length == maximumLength)
        break;
    }

    return elements;
  },

  // Collect items without extending them all:
  rawRecursivelyCollect: function(element, property) {
    element = $(element);
    var elements = [];
    while (element = element[property])
      if (element.nodeType == 1) {
          elements.push(element);
      }
    return elements;
  },

  ancestors: function(element) {
    return Element.recursivelyCollect(element, 'parentNode');
  },

  descendants: function(element) {
    return Element.select(element, "*");
  },

  firstDescendant: function(element) {
    element = $(element).firstChild;
    while (element && element.nodeType != 1) element = element.nextSibling;
    return $(element);
  },

  immediateDescendants: function(element) {
    var results = [], child = $(element).firstChild;
    while (child) {
      if (child.nodeType === 1) {
        results.push(Element.extend(child));
      }
      child = child.nextSibling;
    }
    return results;
  },

  // Find the immediate descendents of the given element without extending them all
  rawImmediateDescendants: function(element) {
    if (!(element = $(element).firstChild)) return [];
    while (element && element.nodeType != 1) element = element.nextSibling;
    if (element) return [element].concat($(element).rawNextSiblings());
    return [];
  },

  previousSiblings: function(element, maximumLength) {
    return Element.recursivelyCollect(element, 'previousSibling');
  },

  nextSiblings: function(element) {
    return Element.recursivelyCollect(element, 'nextSibling');
  },

  // Find the next siblings without actually extending them all
  rawNextSiblings: function(element) {
    return $(element).rawRecursivelyCollect('nextSibling');
  },

  siblings: function(element) {
    element = $(element);
    return Element.previousSiblings(element).reverse()
      .concat(Element.nextSiblings(element));
  },

  match: function(element, selector) {
    element = $(element);
    if (Object.isString(selector))
      return Prototype.Selector.match(element, selector);
    return selector.match(element);
  },

  up: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return $(element.parentNode);
    var ancestors = Element.ancestors(element);
    return Object.isNumber(expression) ? ancestors[expression] :
      Prototype.Selector.find(ancestors, expression, index);
  },

  down: function(element, expression, index) {
    element = $(element);
    if (arguments.length == 1) return Element.firstDescendant(element);
    return Object.isNumber(expression) ? Element.descendants(element)[expression] :
      Element.select(element, expression)[index || 0];
  },

  previous: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.previousSiblings(), expression, index);
    } else {
      return element.recursivelyCollect("previousSibling", index + 1)[index];
    }
  },

  next: function(element, expression, index) {
    element = $(element);
    if (Object.isNumber(expression)) index = expression, expression = false;
    if (!Object.isNumber(index)) index = 0;

    if (expression) {
      return Prototype.Selector.find(element.nextSiblings(), expression, index);
    } else {
      var maximumLength = Object.isNumber(index) ? index + 1 : 1;
      return element.recursivelyCollect("nextSibling", index + 1)[index];
    }
  },


  select: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element);
  },

  adjacent: function(element) {
    element = $(element);
    var expressions = Array.prototype.slice.call(arguments, 1).join(', ');
    return Prototype.Selector.select(expressions, element.parentNode).without(element);
  },

  identify: function(element) {
    element = $(element);
    var id = Element.readAttribute(element, 'id');
    if (id) return id;
    do { id = 'anonymous_element_' + Element.idCounter++ } while ($(id));
    Element.writeAttribute(element, 'id', id);
    return id;
  },

  readAttribute: function(element, name) {
    element = $(element);
    if (Prototype.Browser.IE) {
      var t = Element._attributeTranslations.read;
      if (t.values[name]) return t.values[name](element, name);
      if (t.names[name]) name = t.names[name];
      if (name.include(':')) {
        return (!element.attributes || !element.attributes[name]) ? null :
         element.attributes[name].value;
      }
    }
    return element.getAttribute(name);
  },

  writeAttribute: function(element, name, value) {
    element = $(element);
    var attributes = { }, t = Element._attributeTranslations.write;

    if (typeof name == 'object') attributes = name;
    else attributes[name] = Object.isUndefined(value) ? true : value;

    for (var attr in attributes) {
      name = t.names[attr] || attr;
      value = attributes[attr];
      if (t.values[attr]) name = t.values[attr](element, value);
      if (value === false || value === null)
        element.removeAttribute(name);
      else if (value === true)
        element.setAttribute(name, name);
      else element.setAttribute(name, value);
    }
    return element;
  },

  getHeight: function(element) {
    return Element.getDimensions(element).height;
  },

  getWidth: function(element) {
    return Element.getDimensions(element).width;
  },

  classNames: function(element) {
    return new Element.ClassNames(element);
  },

  hasClassName: function(element, className) {
    if (!(element = $(element))) return;
    var elementClassName = element.className;
    return (elementClassName.length > 0 && (elementClassName == className ||
      new RegExp("(^|\\s)" + className + "(\\s|$)").test(elementClassName)));
  },

  addClassName: function(element, className) {
    if (!(element = $(element))) return;
    if (!Element.hasClassName(element, className))
      element.className += (element.className ? ' ' : '') + className;
    return element;
  },

  removeClassName: function(element, className) {
    if (!(element = $(element))) return;
    element.className = element.className.replace(
      new RegExp("(^|\\s+)" + className + "(\\s+|$)"), ' ').strip();
    return element;
  },

  toggleClassName: function(element, className) {
    if (!(element = $(element))) return;
    return Element[Element.hasClassName(element, className) ?
      'removeClassName' : 'addClassName'](element, className);
  },

  cleanWhitespace: function(element) {
    element = $s(element);
    var node = element.firstChild;
    while (node) {
      var nextNode = node.nextSibling;
      if (node.nodeType == 3 && !/\S/.test(node.nodeValue))
        element.removeChild(node);
      node = nextNode;
    }
    return element;
  },

  empty: function(element) {
    return $(element).innerHTML.blank();
  },

  descendantOf: function(element, ancestor) {
    element = $(element), ancestor = $(ancestor);

    if (element.compareDocumentPosition)
      return (element.compareDocumentPosition(ancestor) & 8) === 8;

    if (ancestor.contains)
      return ancestor.contains(element) && ancestor !== element;

    while (element = element.parentNode)
      if (element == ancestor) return true;

    return false;
  },

  scrollTo: function(element) {
    element = $(element);
    var pos = Element.cumulativeOffset(element);
    window.scrollTo(pos[0], pos[1]);
    return element;
  },

  getStyle: function(element, style) {
    element = $(element);
    style = style == 'float' ? 'cssFloat' : style.camelize();
    var value = element.style[style];
    if (!value || value == 'auto') {
      var css = document.defaultView.getComputedStyle(element, null);
      value = css ? css[style] : null;
    }
    if (style == 'opacity') return value ? parseFloat(value) : 1.0;
    return value == 'auto' ? null : value;
  },

  getOpacity: function(element) {
    return $(element).getStyle('opacity');
  },

  setStyle: function(element, styles) {
    element = $(element);
    var elementStyle = element.style, match;
    if (Object.isString(styles)) {
      element.style.cssText += ';' + styles;
      return styles.include('opacity') ?
        element.setOpacity(styles.match(/opacity:\s*(\d?\.?\d*)/)[1]) : element;
    }
    for (var property in styles)
      if (property == 'opacity') element.setOpacity(styles[property]);
      else
        elementStyle[(property == 'float' || property == 'cssFloat') ?
          (Object.isUndefined(elementStyle.styleFloat) ? 'cssFloat' : 'styleFloat') :
            property] = styles[property];

    return element;
  },

  setOpacity: function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;
    return element;
  },

  makePositioned: function(element) {
    element = $s(element);
    var pos = Element.getStyle(element, 'position');
    if (pos == 'static' || !pos) {
      element._madePositioned = true;
      element.style.position = 'relative';
      if (Prototype.Browser.Opera) {
        element.style.top = 0;
        element.style.left = 0;
      }
    }
    return element;
  },

  undoPositioned: function(element) {
    element = $(element);
    if (element._madePositioned) {
      element._madePositioned = undefined;
      element.style.position =
        element.style.top =
        element.style.left =
        element.style.bottom =
        element.style.right = '';
    }
    return element;
  },

  makeClipping: function(element) {
    element = $(element);
    if (element._overflow) return element;
    element._overflow = Element.getStyle(element, 'overflow') || 'auto';
    if (element._overflow !== 'hidden')
      element.style.overflow = 'hidden';
    return element;
  },

  undoClipping: function(element) {
    element = $(element);
    if (!element._overflow) return element;
    element.style.overflow = element._overflow == 'auto' ? '' : element._overflow;
    element._overflow = null;
    return element;
  },

  clonePosition: function(element, source) {
    var options = Object.extend({
      setLeft:    true,
      setTop:     true,
      setWidth:   true,
      setHeight:  true,
      offsetTop:  0,
      offsetLeft: 0
    }, arguments[2] || { });

    source = $(source);
    var p = Element.viewportOffset(source), delta = [0, 0], parent = null;

    element = $(element);

    if (Element.getStyle(element, 'position') == 'absolute') {
      parent = Element.getOffsetParent(element);
      delta = Element.viewportOffset(parent);
    }

    if (parent == document.body) {
      delta[0] -= document.body.offsetLeft;
      delta[1] -= document.body.offsetTop;
    }

    if (options.setLeft)   element.style.left  = (p[0] - delta[0] + options.offsetLeft) + 'px';
    if (options.setTop)    element.style.top   = (p[1] - delta[1] + options.offsetTop) + 'px';
    if (options.setWidth)  element.style.width = source.offsetWidth + 'px';
    if (options.setHeight) element.style.height = source.offsetHeight + 'px';
    return element;
  }
};

Object.extend(Element.Methods, {
  getElementsBySelector: Element.Methods.select,

  childElements: Element.Methods.immediateDescendants
});

Element._attributeTranslations = {
  write: {
    names: {
      className: 'class',
      htmlFor:   'for'
    },
    values: { }
  }
};

if (Prototype.Browser.Opera) {
  Element.Methods.getStyle = Element.Methods.getStyle.wrap(
    function(proceed, element, style) {
      switch (style) {
        case 'height': case 'width':
          if (!Element.visible(element)) return null;

          var dim = parseInt(proceed(element, style), 10);

          if (dim !== element['offset' + style.capitalize()])
            return dim + 'px';

          var properties;
          if (style === 'height') {
            properties = ['border-top-width', 'padding-top',
             'padding-bottom', 'border-bottom-width'];
          }
          else {
            properties = ['border-left-width', 'padding-left',
             'padding-right', 'border-right-width'];
          }
          return properties.inject(dim, function(memo, property) {
            var val = proceed(element, property);
            return val === null ? memo : memo - parseInt(val, 10);
          }) + 'px';
        default: return proceed(element, style);
      }
    }
  );

  Element.Methods.readAttribute = Element.Methods.readAttribute.wrap(
    function(proceed, element, attribute) {
      if (attribute === 'title') return element.title;
      return proceed(element, attribute);
    }
  );
}

else if (Prototype.Browser.IE) {
  Element.Methods.getStyle = function(element, style) {
    element = $(element);
    style = (style == 'float' || style == 'cssFloat') ? 'styleFloat' : style.camelize();
    var value = element.style[style];
    if (!value && element.currentStyle) value = element.currentStyle[style];

    if (style == 'opacity') {
      if (value = (element.getStyle('filter') || '').match(/alpha\(opacity=(.*)\)/))
        if (value[1]) return parseFloat(value[1]) / 100;
      return 1.0;
    }

    if (value == 'auto') {
      if ((style == 'width' || style == 'height') && (element.getStyle('display') != 'none'))
        return element['offset' + style.capitalize()] + 'px';
      return null;
    }
    return value;
  };

  Element.Methods.setOpacity = function(element, value) {
    function stripAlpha(filter){
      return filter.replace(/alpha\([^\)]*\)/gi,'');
    }
    element = $(element);
    var currentStyle = element.currentStyle;
    if ((currentStyle && !currentStyle.hasLayout) ||
      (!currentStyle && element.style.zoom == 'normal'))
        element.style.zoom = 1;

    var filter = element.getStyle('filter'), style = element.style;
    if (value == 1 || value === '') {
      (filter = stripAlpha(filter)) ?
        style.filter = filter : style.removeAttribute('filter');
      return element;
    } else if (value < 0.00001) value = 0;
    style.filter = stripAlpha(filter) +
      'alpha(opacity=' + (value * 100) + ')';
    return element;
  };

  Element._attributeTranslations = (function(){

    var classProp = 'className',
        forProp = 'for',
        el = document.createElement('div');

    el.setAttribute(classProp, 'x');

    if (el.className !== 'x') {
      el.setAttribute('class', 'x');
      if (el.className === 'x') {
        classProp = 'class';
      }
    }
    el = null;

    el = document.createElement('label');
    el.setAttribute(forProp, 'x');
    if (el.htmlFor !== 'x') {
      el.setAttribute('htmlFor', 'x');
      if (el.htmlFor === 'x') {
        forProp = 'htmlFor';
      }
    }
    el = null;

    return {
      read: {
        names: {
          'class':      classProp,
          'className':  classProp,
          'for':        forProp,
          'htmlFor':    forProp
        },
        values: {
          _getAttr: function(element, attribute) {
            return element.getAttribute(attribute);
          },
          _getAttr2: function(element, attribute) {
            return element.getAttribute(attribute, 2);
          },
          _getAttrNode: function(element, attribute) {
            var node = element.getAttributeNode(attribute);
            return node ? node.value : "";
          },
          _getEv: (function(){

            var el = document.createElement('div'), f;
            el.onclick = Prototype.emptyFunction;
            var value = el.getAttribute('onclick');

            if (String(value).indexOf('{') > -1) {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                attribute = attribute.toString();
                attribute = attribute.split('{')[1];
                attribute = attribute.split('}')[0];
                return attribute.strip();
              };
            }
            else if (value === '') {
              f = function(element, attribute) {
                attribute = element.getAttribute(attribute);
                if (!attribute) return null;
                return attribute.strip();
              };
            }
            el = null;
            return f;
          })(),
          _flag: function(element, attribute) {
            return $(element).hasAttribute(attribute) ? attribute : null;
          },
          style: function(element) {
            return element.style.cssText.toLowerCase();
          },
          title: function(element) {
            return element.title;
          }
        }
      }
    }
  })();

  Element._attributeTranslations.write = {
    names: Object.extend({
      cellpadding: 'cellPadding',
      cellspacing: 'cellSpacing'
    }, Element._attributeTranslations.read.names),
    values: {
      checked: function(element, value) {
        element.checked = !!value;
      },

      style: function(element, value) {
        element.style.cssText = value ? value : '';
      }
    }
  };

  Element._attributeTranslations.has = {};

  $w('colSpan rowSpan vAlign dateTime accessKey tabIndex ' +
      'encType maxLength readOnly longDesc frameBorder').each(function(attr) {
    Element._attributeTranslations.write.names[attr.toLowerCase()] = attr;
    Element._attributeTranslations.has[attr.toLowerCase()] = attr;
  });

  (function(v) {
    Object.extend(v, {
      href:        v._getAttr2,
      src:         v._getAttr2,
      type:        v._getAttr,
      action:      v._getAttrNode,
      disabled:    v._flag,
      checked:     v._flag,
      readonly:    v._flag,
      multiple:    v._flag,
      onload:      v._getEv,
      onunload:    v._getEv,
      onclick:     v._getEv,
      ondblclick:  v._getEv,
      onmousedown: v._getEv,
      onmouseup:   v._getEv,
      onmouseover: v._getEv,
      onmousemove: v._getEv,
      onmouseout:  v._getEv,
      onfocus:     v._getEv,
      onblur:      v._getEv,
      onkeypress:  v._getEv,
      onkeydown:   v._getEv,
      onkeyup:     v._getEv,
      onsubmit:    v._getEv,
      onreset:     v._getEv,
      onselect:    v._getEv,
      onchange:    v._getEv
    });
  })(Element._attributeTranslations.read.values);

  if (Prototype.BrowserFeatures.ElementExtensions) {
    (function() {
      function _descendants(element) {
        var nodes = element.getElementsByTagName('*'), results = [];
        for (var i = 0, node; node = nodes[i]; i++)
          if (node.tagName !== "!") // Filter out comment nodes.
            results.push(node);
        return results;
      }

      Element.Methods.down = function(element, expression, index) {
        element = $(element);
        if (arguments.length == 1) return element.firstDescendant();
        return Object.isNumber(expression) ? _descendants(element)[expression] :
          Element.select(element, expression)[index || 0];
      }
    })();
  }

}

else if (Prototype.Browser.Gecko && /rv:1\.8\.0/.test(navigator.userAgent)) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1) ? 0.999999 :
      (value === '') ? '' : (value < 0.00001) ? 0 : value;
    return element;
  };
}

else if (Prototype.Browser.WebKit) {
  Element.Methods.setOpacity = function(element, value) {
    element = $(element);
    element.style.opacity = (value == 1 || value === '') ? '' :
      (value < 0.00001) ? 0 : value;

    if (value == 1)
      if (element.tagName.toUpperCase() == 'IMG' && element.width) {
        element.width++; element.width--;
      } else try {
        var n = document.createTextNode(' ');
        element.appendChild(n);
        element.removeChild(n);
      } catch (e) { }

    return element;
  };
}

if ('outerHTML' in document.documentElement) {
  Element.Methods.replace = function(element, content) {
    element = $(element);

    if (content && content.toElement) content = content.toElement();
    if (Object.isElement(content)) {
      element.parentNode.replaceChild(content, element);
      return element;
    }

    content = Object.toHTML(content);
    var parent = element.parentNode, tagName = parent.tagName.toUpperCase();

    if (Element._insertionTranslations.tags[tagName]) {
      var nextSibling = element.next(),
          fragments = Element._getContentFromAnonymousElement(tagName, content.stripScripts());
      parent.removeChild(element);
      if (nextSibling)
        fragments.each(function(node) { parent.insertBefore(node, nextSibling) });
      else
        fragments.each(function(node) { parent.appendChild(node) });
    }
    else element.outerHTML = content.stripScripts();

    content.evalScripts.bind(content).defer();
    return element;
  };
}

Element._returnOffset = function(l, t) {
  var result = [l, t];
  result.left = l;
  result.top = t;
  return result;
};

Element._getContentFromAnonymousElement = function(tagName, html, force) {
  var div = new Element('div'),
      t = Element._insertionTranslations.tags[tagName];

  var workaround = false;
  if (t) workaround = true;
  else if (force) {
    workaround = true;
    t = ['', '', 0];
  }

  if (workaround) {
    div.innerHTML = '&nbsp;' + t[0] + html + t[1];
    div.removeChild(div.firstChild);
    for (var i = t[2]; i--; ) {
      div = div.firstChild;
    }
  }
  else {
    div.innerHTML = html;
  }
  return $A(div.childNodes);
};

Element._insertionTranslations = {
  before: function(element, node) {
    element.parentNode.insertBefore(node, element);
  },
  top: function(element, node) {
    element.insertBefore(node, element.firstChild);
  },
  bottom: function(element, node) {
    element.appendChild(node);
  },
  after: function(element, node) {
    element.parentNode.insertBefore(node, element.nextSibling);
  },
  tags: {
    TABLE:  ['<table>',                '</table>',                   1],
    TBODY:  ['<table><tbody>',         '</tbody></table>',           2],
    TR:     ['<table><tbody><tr>',     '</tr></tbody></table>',      3],
    TD:     ['<table><tbody><tr><td>', '</td></tr></tbody></table>', 4],
    SELECT: ['<select>',               '</select>',                  1]
  }
};

(function() {
  var tags = Element._insertionTranslations.tags;
  Object.extend(tags, {
    THEAD: tags.TBODY,
    TFOOT: tags.TBODY,
    TH:    tags.TD
  });
})();

Element.Methods.Simulated = {
  hasAttribute: function(element, attribute) {
    attribute = Element._attributeTranslations.has[attribute] || attribute;
    var node = $(element).getAttributeNode(attribute);
    return !!(node && node.specified);
  }
};

Element.Methods.ByTag = { };

Object.extend(Element, Element.Methods);

(function(div) {

  if (!Prototype.BrowserFeatures.ElementExtensions && div['__proto__']) {
    window.HTMLElement = { };
    window.HTMLElement.prototype = div['__proto__'];
    Prototype.BrowserFeatures.ElementExtensions = true;
  }

  div = null;

})(document.createElement('div'));

Element.extend = (function() {

  function checkDeficiency(tagName) {
    if (typeof window.Element != 'undefined') {
      var proto = window.Element.prototype;
      if (proto) {
        var id = '_' + (Math.random()+'').slice(2),
            el = document.createElement(tagName);
        proto[id] = 'x';
        var isBuggy = (el[id] !== 'x');
        delete proto[id];
        el = null;
        return isBuggy;
      }
    }
    return false;
  }

  function extendElementWith(element, methods) {
    for (var property in methods) {
      var value = methods[property];
      if (Object.isFunction(value) && !(property in element))
        element[property] = value.methodize();
    }
  }

  var HTMLOBJECTELEMENT_PROTOTYPE_BUGGY = checkDeficiency('object');

  if (Prototype.BrowserFeatures.SpecificElementExtensions) {
    if (HTMLOBJECTELEMENT_PROTOTYPE_BUGGY) {
      return function(element) {
        if (element && typeof element._extendedByPrototype == 'undefined') {
          var t = element.tagName;
          if (t && (/^(?:object|applet|embed)$/i.test(t))) {
            extendElementWith(element, Element.Methods);
            extendElementWith(element, Element.Methods.Simulated);
            extendElementWith(element, Element.Methods.ByTag[t.toUpperCase()]);
          }
        }
        return element;
      }
    }
    return Prototype.K;
  }

  var Methods = { }, ByTag = Element.Methods.ByTag;

  var extend = Object.extend(function(element) {
    if (!element || typeof element._extendedByPrototype != 'undefined' ||
        element.nodeType != 1 || element == window) return element;

    var methods = Object.clone(Methods),
        tagName = element.tagName.toUpperCase();

    if (ByTag[tagName]) Object.extend(methods, ByTag[tagName]);

    extendElementWith(element, methods);

    element._extendedByPrototype = Prototype.emptyFunction;
    return element;

  }, {
    refresh: function() {
      if (!Prototype.BrowserFeatures.ElementExtensions) {
        Object.extend(Methods, Element.Methods);
        Object.extend(Methods, Element.Methods.Simulated);
      }
    }
  });

  extend.refresh();
  return extend;
})();

if (document.documentElement.hasAttribute) {
  Element.hasAttribute = function(element, attribute) {
    return element.hasAttribute(attribute);
  };
}
else {
  Element.hasAttribute = Element.Methods.Simulated.hasAttribute;
}

Element.addMethods = function(methods) {
  var F = Prototype.BrowserFeatures, T = Element.Methods.ByTag;

  if (!methods) {
    Object.extend(Form, Form.Methods);
    Object.extend(Form.Element, Form.Element.Methods);
    Object.extend(Element.Methods.ByTag, {
      "FORM":     Object.clone(Form.Methods),
      "INPUT":    Object.clone(Form.Element.Methods),
      "SELECT":   Object.clone(Form.Element.Methods),
      "TEXTAREA": Object.clone(Form.Element.Methods),
      "BUTTON":   Object.clone(Form.Element.Methods)
    });
  }

  if (arguments.length == 2) {
    var tagName = methods;
    methods = arguments[1];
  }

  if (!tagName) Object.extend(Element.Methods, methods || { });
  else {
    if (Object.isArray(tagName)) tagName.each(extend);
    else extend(tagName);
  }

  function extend(tagName) {
    tagName = tagName.toUpperCase();
    if (!Element.Methods.ByTag[tagName])
      Element.Methods.ByTag[tagName] = { };
    Object.extend(Element.Methods.ByTag[tagName], methods);
  }

  function copy(methods, destination, onlyIfAbsent) {
    onlyIfAbsent = onlyIfAbsent || false;
    for (var property in methods) {
      var value = methods[property];
      if (!Object.isFunction(value)) continue;
      if (!onlyIfAbsent || !(property in destination))
        destination[property] = value.methodize();
    }
  }

  function findDOMClass(tagName) {
    var klass;
    var trans = {
      "OPTGROUP": "OptGroup", "TEXTAREA": "TextArea", "P": "Paragraph",
      "FIELDSET": "FieldSet", "UL": "UList", "OL": "OList", "DL": "DList",
      "DIR": "Directory", "H1": "Heading", "H2": "Heading", "H3": "Heading",
      "H4": "Heading", "H5": "Heading", "H6": "Heading", "Q": "Quote",
      "INS": "Mod", "DEL": "Mod", "A": "Anchor", "IMG": "Image", "CAPTION":
      "TableCaption", "COL": "TableCol", "COLGROUP": "TableCol", "THEAD":
      "TableSection", "TFOOT": "TableSection", "TBODY": "TableSection", "TR":
      "TableRow", "TH": "TableCell", "TD": "TableCell", "FRAMESET":
      "FrameSet", "IFRAME": "IFrame"
    };
    if (trans[tagName]) klass = 'HTML' + trans[tagName] + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName + 'Element';
    if (window[klass]) return window[klass];
    klass = 'HTML' + tagName.capitalize() + 'Element';
    if (window[klass]) return window[klass];

    var element = document.createElement(tagName),
        proto = element['__proto__'] || element.constructor.prototype;

    element = null;
    return proto;
  }

  var elementPrototype = window.HTMLElement ? HTMLElement.prototype :
   Element.prototype;

  if (F.ElementExtensions) {
    copy(Element.Methods, elementPrototype);
    copy(Element.Methods.Simulated, elementPrototype, true);
  }

  if (F.SpecificElementExtensions) {
    for (var tag in Element.Methods.ByTag) {
      var klass = findDOMClass(tag);
      if (Object.isUndefined(klass)) continue;
      copy(T[tag], klass.prototype);
    }
  }

  Object.extend(Element, Element.Methods);
  delete Element.ByTag;

  if (Element.extend.refresh) Element.extend.refresh();
  Element.cache = { };
};


document.viewport = {

  getDimensions: function() {
    return { width: this.getWidth(), height: this.getHeight() };
  },

  getScrollOffsets: function() {
    return Element._returnOffset(
      window.pageXOffset || document.documentElement.scrollLeft || document.body.scrollLeft,
      window.pageYOffset || document.documentElement.scrollTop  || document.body.scrollTop);
  }
};

(function(viewport) {
  var B = Prototype.Browser, doc = document, element, property = {};

  function getRootElement() {
    if (B.WebKit && !doc.evaluate)
      return document;

    if (B.Opera && window.parseFloat(window.opera.version()) < 9.5)
      return document.body;

    return document.documentElement;
  }

  function define(D) {
    if (!element) element = getRootElement();

    property[D] = 'client' + D;

    viewport['get' + D] = function() { return element[property[D]] };
    return viewport['get' + D]();
  }

  viewport.getWidth  = define.curry('Width');

  viewport.getHeight = define.curry('Height');
})(document.viewport);


Element.Storage = {
  UID: 1
};

Element.addMethods({
  getStorage: function(element) {
    if (!(element = $(element))) return;

    var uid;
    if (element === window) {
      uid = 0;
    } else {
      if (typeof element._prototypeUID === "undefined")
        element._prototypeUID = Element.Storage.UID++;
      uid = element._prototypeUID;
    }

    if (!Element.Storage[uid])
      Element.Storage[uid] = $H();

    return Element.Storage[uid];
  },

  store: function(element, key, value) {
    if (!(element = $(element))) return;

    if (arguments.length === 2) {
      Element.getStorage(element).update(key);
    } else {
      Element.getStorage(element).set(key, value);
    }

    return element;
  },

  retrieve: function(element, key, defaultValue) {
    if (!(element = $(element))) return;
    var hash = Element.getStorage(element), value = hash.get(key);

    if (Object.isUndefined(value)) {
      hash.set(key, defaultValue);
      value = defaultValue;
    }

    return value;
  },

  clone: function(element, deep) {
    if (!(element = $(element))) return;
    var clone = element.cloneNode(deep);
    clone._prototypeUID = void 0;
    if (deep) {
      var descendants = Element.select(clone, '*'),
          i = descendants.length;
      while (i--) {
        descendants[i]._prototypeUID = void 0;
      }
    }
    return Element.extend(clone);
  },

  purge: function(element) {
    if (!(element = $(element))) return;
    var purgeElement = Element._purgeElement;

    purgeElement(element);

    var descendants = element.getElementsByTagName('*'),
     i = descendants.length;

    while (i--) purgeElement(descendants[i]);

    return null;
  }
});

(function() {

  function toDecimal(pctString) {
    var match = pctString.match(/^(\d+)%?$/i);
    if (!match) return null;
    return (Number(match[1]) / 100);
  }

  function getPixelValue(value, property, context) {
    var element = null;
    if (Object.isElement(value)) {
      element = value;
      value = element.getStyle(property);
    }

    if (value === null) {
      return null;
    }

    if ((/^(?:-)?\d+(\.\d+)?(px)?$/i).test(value)) {
      return window.parseFloat(value);
    }

    var isPercentage = value.include('%'), isViewport = (context === document.viewport);

    if (/\d/.test(value) && element && element.runtimeStyle && !(isPercentage && isViewport)) {
      var style = element.style.left, rStyle = element.runtimeStyle.left;
      element.runtimeStyle.left = element.currentStyle.left;
      element.style.left = value || 0;
      value = element.style.pixelLeft;
      element.style.left = style;
      element.runtimeStyle.left = rStyle;

      return value;
    }

    if (element && isPercentage) {
      context = context || element.parentNode;
      var decimal = toDecimal(value);
      var whole = null;
      var position = element.getStyle('position');

      var isHorizontal = property.include('left') || property.include('right') ||
       property.include('width');

      var isVertical =  property.include('top') || property.include('bottom') ||
        property.include('height');

      if (context === document.viewport) {
        if (isHorizontal) {
          whole = document.viewport.getWidth();
        } else if (isVertical) {
          whole = document.viewport.getHeight();
        }
      } else {
        if (isHorizontal) {
          whole = $(context).measure('width');
        } else if (isVertical) {
          whole = $(context).measure('height');
        }
      }

      return (whole === null) ? 0 : whole * decimal;
    }

    return 0;
  }

  function toCSSPixels(number) {
    if (Object.isString(number) && number.endsWith('px')) {
      return number;
    }
    return number + 'px';
  }

  function isDisplayed(element) {
    var originalElement = element;
    while (element && element.parentNode) {
      var display = element.getStyle('display');
      if (display === 'none') {
        return false;
      }
      element = $(element.parentNode);
    }
    return true;
  }

  var hasLayout = Prototype.K;
  if ('currentStyle' in document.documentElement) {
    hasLayout = function(element) {
      if (!element.currentStyle.hasLayout) {
        element.style.zoom = 1;
      }
      return element;
    };
  }

  function cssNameFor(key) {
    if (key.include('border')) key = key + '-width';
    return key.camelize();
  }

  Element.Layout = Class.create(Hash, {
    initialize: function($super, element, preCompute) {
      $super();
      this.element = $(element);

      Element.Layout.PROPERTIES.each( function(property) {
        this._set(property, null);
      }, this);

      if (preCompute) {
        this._preComputing = true;
        this._begin();
        Element.Layout.PROPERTIES.each( this._compute, this );
        this._end();
        this._preComputing = false;
      }
    },

    _set: function(property, value) {
      return Hash.prototype.set.call(this, property, value);
    },

    set: function(property, value) {
      throw "Properties of Element.Layout are read-only.";
    },

    get: function($super, property) {
      var value = $super(property);
      return value === null ? this._compute(property) : value;
    },

    _begin: function() {
      if (this._prepared) return;

      var element = this.element;
      if (isDisplayed(element)) {
        this._prepared = true;
        return;
      }

      var originalStyles = {
        position:   element.style.position   || '',
        width:      element.style.width      || '',
        visibility: element.style.visibility || '',
        display:    element.style.display    || ''
      };

      element.store('prototype_original_styles', originalStyles);

      var position = element.getStyle('position'),
       width = element.getStyle('width');

      if (width === "0px" || width === null) {
        element.style.display = 'block';
        width = element.getStyle('width');
      }

      var context = (position === 'fixed') ? document.viewport :
       element.parentNode;

      element.setStyle({
        position:   'absolute',
        visibility: 'hidden',
        display:    'block'
      });

      var positionedWidth = element.getStyle('width');

      var newWidth;
      if (width && (positionedWidth === width)) {
        newWidth = getPixelValue(element, 'width', context);
      } else if (position === 'absolute' || position === 'fixed') {
        newWidth = getPixelValue(element, 'width', context);
      } else {
        var parent = element.parentNode, pLayout = $(parent).getLayout();

        newWidth = pLayout.get('width') -
         this.get('margin-left') -
         this.get('border-left') -
         this.get('padding-left') -
         this.get('padding-right') -
         this.get('border-right') -
         this.get('margin-right');
      }

      element.setStyle({ width: newWidth + 'px' });

      this._prepared = true;
    },

    _end: function() {
      var element = this.element;
      var originalStyles = element.retrieve('prototype_original_styles');
      element.store('prototype_original_styles', null);
      element.setStyle(originalStyles);
      this._prepared = false;
    },

    _compute: function(property) {
      var COMPUTATIONS = Element.Layout.COMPUTATIONS;
      if (!(property in COMPUTATIONS)) {
        throw "Property not found.";
      }

      return this._set(property, COMPUTATIONS[property].call(this, this.element));
    },

    toObject: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var obj = {};
      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        var value = this.get(key);
        if (value != null) obj[key] = value;
      }, this);
      return obj;
    },

    toHash: function() {
      var obj = this.toObject.apply(this, arguments);
      return new Hash(obj);
    },

    toCSS: function() {
      var args = $A(arguments);
      var keys = (args.length === 0) ? Element.Layout.PROPERTIES :
       args.join(' ').split(' ');
      var css = {};

      keys.each( function(key) {
        if (!Element.Layout.PROPERTIES.include(key)) return;
        if (Element.Layout.COMPOSITE_PROPERTIES.include(key)) return;

        var value = this.get(key);
        if (value != null) css[cssNameFor(key)] = value + 'px';
      }, this);
      return css;
    },

    inspect: function() {
      return "#<Element.Layout>";
    }
  });

  Object.extend(Element.Layout, {
    PROPERTIES: $w('height width top left right bottom border-left border-right border-top border-bottom padding-left padding-right padding-top padding-bottom margin-top margin-bottom margin-left margin-right padding-box-width padding-box-height border-box-width border-box-height margin-box-width margin-box-height'),

    COMPOSITE_PROPERTIES: $w('padding-box-width padding-box-height margin-box-width margin-box-height border-box-width border-box-height'),

    COMPUTATIONS: {
      'height': function(element) {
        if (!this._preComputing) this._begin();

        var bHeight = this.get('border-box-height');
        if (bHeight <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bTop = this.get('border-top'),
         bBottom = this.get('border-bottom');

        var pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        if (!this._preComputing) this._end();

        return bHeight - bTop - bBottom - pTop - pBottom;
      },

      'width': function(element) {
        if (!this._preComputing) this._begin();

        var bWidth = this.get('border-box-width');
        if (bWidth <= 0) {
          if (!this._preComputing) this._end();
          return 0;
        }

        var bLeft = this.get('border-left'),
         bRight = this.get('border-right');

        var pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        if (!this._preComputing) this._end();

        return bWidth - bLeft - bRight - pLeft - pRight;
      },

      'padding-box-height': function(element) {
        var height = this.get('height'),
         pTop = this.get('padding-top'),
         pBottom = this.get('padding-bottom');

        return height + pTop + pBottom;
      },

      'padding-box-width': function(element) {
        var width = this.get('width'),
         pLeft = this.get('padding-left'),
         pRight = this.get('padding-right');

        return width + pLeft + pRight;
      },

      'border-box-height': function(element) {
        if (!this._preComputing) this._begin();
        var height = element.offsetHeight;
        if (!this._preComputing) this._end();
        return height;
      },

      'border-box-width': function(element) {
        if (!this._preComputing) this._begin();
        var width = element.offsetWidth;
        if (!this._preComputing) this._end();
        return width;
      },

      'margin-box-height': function(element) {
        var bHeight = this.get('border-box-height'),
         mTop = this.get('margin-top'),
         mBottom = this.get('margin-bottom');

        if (bHeight <= 0) return 0;

        return bHeight + mTop + mBottom;
      },

      'margin-box-width': function(element) {
        var bWidth = this.get('border-box-width'),
         mLeft = this.get('margin-left'),
         mRight = this.get('margin-right');

        if (bWidth <= 0) return 0;

        return bWidth + mLeft + mRight;
      },

      'top': function(element) {
        var offset = element.positionedOffset();
        return offset.top;
      },

      'bottom': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pHeight = parent.measure('height');

        var mHeight = this.get('border-box-height');

        return pHeight - mHeight - offset.top;
      },

      'left': function(element) {
        var offset = element.positionedOffset();
        return offset.left;
      },

      'right': function(element) {
        var offset = element.positionedOffset(),
         parent = element.getOffsetParent(),
         pWidth = parent.measure('width');

        var mWidth = this.get('border-box-width');

        return pWidth - mWidth - offset.left;
      },

      'padding-top': function(element) {
        return getPixelValue(element, 'paddingTop');
      },

      'padding-bottom': function(element) {
        return getPixelValue(element, 'paddingBottom');
      },

      'padding-left': function(element) {
        return getPixelValue(element, 'paddingLeft');
      },

      'padding-right': function(element) {
        return getPixelValue(element, 'paddingRight');
      },

      'border-top': function(element) {
        return getPixelValue(element, 'borderTopWidth');
      },

      'border-bottom': function(element) {
        return getPixelValue(element, 'borderBottomWidth');
      },

      'border-left': function(element) {
        return getPixelValue(element, 'borderLeftWidth');
      },

      'border-right': function(element) {
        return getPixelValue(element, 'borderRightWidth');
      },

      'margin-top': function(element) {
        return getPixelValue(element, 'marginTop');
      },

      'margin-bottom': function(element) {
        return getPixelValue(element, 'marginBottom');
      },

      'margin-left': function(element) {
        return getPixelValue(element, 'marginLeft');
      },

      'margin-right': function(element) {
        return getPixelValue(element, 'marginRight');
      }
    }
  });

  if ('getBoundingClientRect' in document.documentElement) {
    Object.extend(Element.Layout.COMPUTATIONS, {
      'right': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.right - rect.right).round();
      },

      'bottom': function(element) {
        var parent = hasLayout(element.getOffsetParent());
        var rect = element.getBoundingClientRect(),
         pRect = parent.getBoundingClientRect();

        return (pRect.bottom - rect.bottom).round();
      }
    });
  }

  Element.Offset = Class.create({
    initialize: function(left, top) {
      this.left = left.round();
      this.top  = top.round();

      this[0] = this.left;
      this[1] = this.top;
    },

    relativeTo: function(offset) {
      return new Element.Offset(
        this.left - offset.left,
        this.top  - offset.top
      );
    },

    inspect: function() {
      return "#<Element.Offset left: #{left} top: #{top}>".interpolate(this);
    },

    toString: function() {
      return "[#{left}, #{top}]".interpolate(this);
    },

    toArray: function() {
      return [this.left, this.top];
    }
  });

  function getLayout(element, preCompute) {
    return new Element.Layout(element, preCompute);
  }

  function measure(element, property) {
    return $(element).getLayout().get(property);
  }

  function getDimensions(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');

    if (display && display !== 'none') {
      return { width: element.offsetWidth, height: element.offsetHeight };
    }

    var style = element.style;
    var originalStyles = {
      visibility: style.visibility,
      position:   style.position,
      display:    style.display
    };

    var newStyles = {
      visibility: 'hidden',
      display:    'block'
    };

    if (originalStyles.position !== 'fixed')
      newStyles.position = 'absolute';

    Element.setStyle(element, newStyles);

    var dimensions = {
      width:  element.offsetWidth,
      height: element.offsetHeight
    };

    Element.setStyle(element, originalStyles);

    return dimensions;
  }

  // Implementing a new method to avoid retesting the entire application with clientHeight
  function getDimensionsEx(element) {
    element = $(element);
    var display = Element.getStyle(element, 'display');
    if (display && display != 'none') { // Safari bug
      return {width: element.clientWidth, height: element.clientHeight};
    }
    return getDimensions(element);
  }

  function getOffsetParent(element) {
    element = $(element);

    if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
      return $(document.body);

    var isInline = (Element.getStyle(element, 'display') === 'inline');
    if (!isInline && element.offsetParent) return $(element.offsetParent);

    while ((element = element.parentNode) && element !== document.body) {
      if (Element.getStyle(element, 'position') !== 'static') {
        return isHtml(element) ? $(document.body) : $(element);
      }
    }

    return $(document.body);
  }


  function cumulativeOffset(element) {
    element = $(element);
    var valueT = 0, valueL = 0;
    if (element.parentNode) {
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        element = element.offsetParent;
      } while (element);
    }
    return new Element.Offset(valueL, valueT);
  }

  function positionedOffset(element) {
    element = $(element);

    var layout = element.getLayout();

    var valueT = 0, valueL = 0;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      element = element.offsetParent;
      if (element) {
        if (isBody(element)) break;
        var p = Element.getStyle(element, 'position');
        if (p !== 'static') break;
      }
    } while (element);

    valueL -= layout.get('margin-top');
    valueT -= layout.get('margin-left');

    return new Element.Offset(valueL, valueT);
  }

  function cumulativeScrollOffset(element) {
    var valueT = 0, valueL = 0;
    do {
      valueT += element.scrollTop  || 0;
      valueL += element.scrollLeft || 0;
      element = element.parentNode;
    } while (element);
    return new Element.Offset(valueL, valueT);
  }

  function viewportOffset(forElement) {
    element = $(element);
    var valueT = 0, valueL = 0, docBody = document.body;

    var element = forElement;
    do {
      valueT += element.offsetTop  || 0;
      valueL += element.offsetLeft || 0;
      if (element.offsetParent == docBody &&
        Element.getStyle(element, 'position') == 'absolute') break;
    } while (element = element.offsetParent);

    element = forElement;
    do {
      if (element != docBody) {
        valueT -= element.scrollTop  || 0;
        valueL -= element.scrollLeft || 0;
      }
    } while (element = element.parentNode);
    return new Element.Offset(valueL, valueT);
  }

  function absolutize(element) {
    element = $(element);

    if (Element.getStyle(element, 'position') === 'absolute') {
      return element;
    }

    var offsetParent = getOffsetParent(element);
    var eOffset = element.viewportOffset(),
     pOffset = offsetParent.viewportOffset();

    var offset = eOffset.relativeTo(pOffset);
    var layout = element.getLayout();

    element.store('prototype_absolutize_original_styles', {
      left:   element.getStyle('left'),
      top:    element.getStyle('top'),
      width:  element.getStyle('width'),
      height: element.getStyle('height')
    });

    element.setStyle({
      position: 'absolute',
      top:    offset.top + 'px',
      left:   offset.left + 'px',
      width:  layout.get('width') + 'px',
      height: layout.get('height') + 'px'
    });

    return element;
  }

  function relativize(element) {
    element = $(element);
    if (Element.getStyle(element, 'position') === 'relative') {
      return element;
    }

    var originalStyles =
     element.retrieve('prototype_absolutize_original_styles');

    if (originalStyles) element.setStyle(originalStyles);
    return element;
  }

  if (Prototype.Browser.IE) {
    getOffsetParent = getOffsetParent.wrap(
      function(proceed, element) {
        element = $(element);

        if (isDocument(element) || isDetached(element) || isBody(element) || isHtml(element))
          return $(document.body);

        var position = element.getStyle('position');
        if (position !== 'static') return proceed(element);

        element.setStyle({ position: 'relative' });
        var value = proceed(element);
        element.setStyle({ position: position });
        return value;
      }
    );

    positionedOffset = positionedOffset.wrap(function(proceed, element) {
      element = $(element);
      if (!element.parentNode) return new Element.Offset(0, 0);
      var position = element.getStyle('position');
      if (position !== 'static') return proceed(element);

      var offsetParent = element.getOffsetParent();
      if (offsetParent && offsetParent.getStyle('position') === 'fixed')
        hasLayout(offsetParent);

      element.setStyle({ position: 'relative' });
      var value = proceed(element);
      element.setStyle({ position: position });
      return value;
    });
  } else if (Prototype.Browser.Webkit) {
    cumulativeOffset = function(element) {
      element = $(element);
      var valueT = 0, valueL = 0;
      do {
        valueT += element.offsetTop  || 0;
        valueL += element.offsetLeft || 0;
        if (element.offsetParent == document.body)
          if (Element.getStyle(element, 'position') == 'absolute') break;

        element = element.offsetParent;
      } while (element);

      return new Element.Offset(valueL, valueT);
    };
  }


  Element.addMethods({
    getLayout:              getLayout,
    measure:                measure,
    getDimensions:          getDimensions,
    getDimensionsEx:        getDimensionsEx,
    getOffsetParent:        getOffsetParent,
    cumulativeOffset:       cumulativeOffset,
    positionedOffset:       positionedOffset,
    cumulativeScrollOffset: cumulativeScrollOffset,
    viewportOffset:         viewportOffset,
    absolutize:             absolutize,
    relativize:             relativize
  });

  function isBody(element) {
    return element.nodeName.toUpperCase() === 'BODY';
  }

  function isHtml(element) {
    return element.nodeName.toUpperCase() === 'HTML';
  }

  function isDocument(element) {
    return element.nodeType === Node.DOCUMENT_NODE;
  }

  function isDetached(element) {
    return element !== document.body &&
     !Element.descendantOf(element, document.body);
  }

  if ('getBoundingClientRect' in document.documentElement) {
    Element.addMethods({
      viewportOffset: function(element) {
        element = $(element);
        if (isDetached(element)) return new Element.Offset(0, 0);

        var rect = element.getBoundingClientRect(),
         docEl = document.documentElement;
        return new Element.Offset(rect.left - docEl.clientLeft,
         rect.top - docEl.clientTop);
      }
    });
  }
})();
window.$$ = function() {
  var expression = $A(arguments).join(', ');
  return Prototype.Selector.select(expression, document);
};

Prototype.Selector = (function() {

  function select() {
    throw new Error('Method "Prototype.Selector.select" must be defined.');
  }

  function match() {
    throw new Error('Method "Prototype.Selector.match" must be defined.');
  }

  function find(elements, expression, index) {
    index = index || 0;
    var match = Prototype.Selector.match, length = elements.length, matchIndex = 0, i;

    for (i = 0; i < length; i++) {
      if (match(elements[i], expression) && index == matchIndex++) {
        return Element.extend(elements[i]);
      }
    }
  }

  function extendElements(elements) {
    for (var i = 0, length = elements.length; i < length; i++) {
      Element.extend(elements[i]);
    }
    return elements;
  }


  var K = Prototype.K;

  return {
    select: select,
    match: match,
    find: find,
    extendElements: (Element.extend === K) ? K : extendElements,
    extendElement: Element.extend
  };
})();
Prototype._original_property = window.Sizzle;
/*!
 * Sizzle CSS Selector Engine - v1.0
 *  Copyright 2009, The Dojo Foundation
 *  Released under the MIT, BSD, and GPL Licenses.
 *  More information: http://sizzlejs.com/
 */
(function(){

var chunker = /((?:\((?:\([^()]+\)|[^()]+)+\)|\[(?:\[[^[\]]*\]|['"][^'"]*['"]|[^[\]'"]+)+\]|\\.|[^ >+~,(\[\\]+)+|[>+~])(\s*,\s*)?((?:.|\r|\n)*)/g,
	done = 0,
	toString = Object.prototype.toString,
	hasDuplicate = false,
	baseHasDuplicate = true;

[0, 0].sort(function(){
	baseHasDuplicate = false;
	return 0;
});

var Sizzle = function(selector, context, results, seed) {
	results = results || [];
	var origContext = context = context || document;

	if ( context.nodeType !== 1 && context.nodeType !== 9 ) {
		return [];
	}

	if ( !selector || typeof selector !== "string" ) {
		return results;
	}

	var parts = [], m, set, checkSet, check, mode, extra, prune = true, contextXML = isXML(context),
		soFar = selector;

	while ( (chunker.exec(""), m = chunker.exec(soFar)) !== null ) {
		soFar = m[3];

		parts.push( m[1] );

		if ( m[2] ) {
			extra = m[3];
			break;
		}
	}

	if ( parts.length > 1 && origPOS.exec( selector ) ) {
		if ( parts.length === 2 && Expr.relative[ parts[0] ] ) {
			set = posProcess( parts[0] + parts[1], context );
		} else {
			set = Expr.relative[ parts[0] ] ?
				[ context ] :
				Sizzle( parts.shift(), context );

			while ( parts.length ) {
				selector = parts.shift();

				if ( Expr.relative[ selector ] )
					selector += parts.shift();

				set = posProcess( selector, set );
			}
		}
	} else {
		if ( !seed && parts.length > 1 && context.nodeType === 9 && !contextXML &&
				Expr.match.ID.test(parts[0]) && !Expr.match.ID.test(parts[parts.length - 1]) ) {
			var ret = Sizzle.find( parts.shift(), context, contextXML );
			context = ret.expr ? Sizzle.filter( ret.expr, ret.set )[0] : ret.set[0];
		}

		if ( context ) {
			var ret = seed ?
				{ expr: parts.pop(), set: makeArray(seed) } :
				Sizzle.find( parts.pop(), parts.length === 1 && (parts[0] === "~" || parts[0] === "+") && context.parentNode ? context.parentNode : context, contextXML );
			set = ret.expr ? Sizzle.filter( ret.expr, ret.set ) : ret.set;

			if ( parts.length > 0 ) {
				checkSet = makeArray(set);
			} else {
				prune = false;
			}

			while ( parts.length ) {
				var cur = parts.pop(), pop = cur;

				if ( !Expr.relative[ cur ] ) {
					cur = "";
				} else {
					pop = parts.pop();
				}

				if ( pop == null ) {
					pop = context;
				}

				Expr.relative[ cur ]( checkSet, pop, contextXML );
			}
		} else {
			checkSet = parts = [];
		}
	}

	if ( !checkSet ) {
		checkSet = set;
	}

	if ( !checkSet ) {
		throw "Syntax error, unrecognized expression: " + (cur || selector);
	}

	if ( toString.call(checkSet) === "[object Array]" ) {
		if ( !prune ) {
			results.push.apply( results, checkSet );
		} else if ( context && context.nodeType === 1 ) {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && (checkSet[i] === true || checkSet[i].nodeType === 1 && contains(context, checkSet[i])) ) {
					results.push( set[i] );
				}
			}
		} else {
			for ( var i = 0; checkSet[i] != null; i++ ) {
				if ( checkSet[i] && checkSet[i].nodeType === 1 ) {
					results.push( set[i] );
				}
			}
		}
	} else {
		makeArray( checkSet, results );
	}

	if ( extra ) {
		Sizzle( extra, origContext, results, seed );
		Sizzle.uniqueSort( results );
	}

	return results;
};

Sizzle.uniqueSort = function(results){
	if ( sortOrder ) {
		hasDuplicate = baseHasDuplicate;
		results.sort(sortOrder);

		if ( hasDuplicate ) {
			for ( var i = 1; i < results.length; i++ ) {
				if ( results[i] === results[i-1] ) {
					results.splice(i--, 1);
				}
			}
		}
	}

	return results;
};

Sizzle.matches = function(expr, set){
	return Sizzle(expr, null, null, set);
};

Sizzle.find = function(expr, context, isXML){
	var set, match;

	if ( !expr ) {
		return [];
	}

	for ( var i = 0, l = Expr.order.length; i < l; i++ ) {
		var type = Expr.order[i], match;

		if ( (match = Expr.leftMatch[ type ].exec( expr )) ) {
			var left = match[1];
			match.splice(1,1);

			if ( left.substr( left.length - 1 ) !== "\\" ) {
				match[1] = (match[1] || "").replace(/\\/g, "");
				set = Expr.find[ type ]( match, context, isXML );
				if ( set != null ) {
					expr = expr.replace( Expr.match[ type ], "" );
					break;
				}
			}
		}
	}

	if ( !set ) {
		set = context.getElementsByTagName("*");
	}

	return {set: set, expr: expr};
};

Sizzle.filter = function(expr, set, inplace, not){
	var old = expr, result = [], curLoop = set, match, anyFound,
		isXMLFilter = set && set[0] && isXML(set[0]);

	while ( expr && set.length ) {
		for ( var type in Expr.filter ) {
			if ( (match = Expr.match[ type ].exec( expr )) != null ) {
				var filter = Expr.filter[ type ], found, item;
				anyFound = false;

				if ( curLoop == result ) {
					result = [];
				}

				if ( Expr.preFilter[ type ] ) {
					match = Expr.preFilter[ type ]( match, curLoop, inplace, result, not, isXMLFilter );

					if ( !match ) {
						anyFound = found = true;
					} else if ( match === true ) {
						continue;
					}
				}

				if ( match ) {
					for ( var i = 0; (item = curLoop[i]) != null; i++ ) {
						if ( item ) {
							found = filter( item, match, i, curLoop );
							var pass = not ^ !!found;

							if ( inplace && found != null ) {
								if ( pass ) {
									anyFound = true;
								} else {
									curLoop[i] = false;
								}
							} else if ( pass ) {
								result.push( item );
								anyFound = true;
							}
						}
					}
				}

				if ( found !== undefined ) {
					if ( !inplace ) {
						curLoop = result;
					}

					expr = expr.replace( Expr.match[ type ], "" );

					if ( !anyFound ) {
						return [];
					}

					break;
				}
			}
		}

		if ( expr == old ) {
			if ( anyFound == null ) {
				throw "Syntax error, unrecognized expression: " + expr;
			} else {
				break;
			}
		}

		old = expr;
	}

	return curLoop;
};

var Expr = Sizzle.selectors = {
	order: [ "ID", "NAME", "TAG" ],
	match: {
		ID: /#((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		CLASS: /\.((?:[\w\u00c0-\uFFFF-]|\\.)+)/,
		NAME: /\[name=['"]*((?:[\w\u00c0-\uFFFF-]|\\.)+)['"]*\]/,
		ATTR: /\[\s*((?:[\w\u00c0-\uFFFF-]|\\.)+)\s*(?:(\S?=)\s*(['"]*)(.*?)\3|)\s*\]/,
		TAG: /^((?:[\w\u00c0-\uFFFF\*-]|\\.)+)/,
		CHILD: /:(only|nth|last|first)-child(?:\((even|odd|[\dn+-]*)\))?/,
		POS: /:(nth|eq|gt|lt|first|last|even|odd)(?:\((\d*)\))?(?=[^-]|$)/,
		PSEUDO: /:((?:[\w\u00c0-\uFFFF-]|\\.)+)(?:\((['"]*)((?:\([^\)]+\)|[^\2\(\)]*)+)\2\))?/
	},
	leftMatch: {},
	attrMap: {
		"class": "className",
		"for": "htmlFor"
	},
	attrHandle: {
		href: function(elem){
			return elem.getAttribute("href");
		}
	},
	relative: {
		"+": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string",
				isTag = isPartStr && !/\W/.test(part),
				isPartStrNotTag = isPartStr && !isTag;

			if ( isTag && !isXML ) {
				part = part.toUpperCase();
			}

			for ( var i = 0, l = checkSet.length, elem; i < l; i++ ) {
				if ( (elem = checkSet[i]) ) {
					while ( (elem = elem.previousSibling) && elem.nodeType !== 1 ) {}

					checkSet[i] = isPartStrNotTag || elem && elem.nodeName === part ?
						elem || false :
						elem === part;
				}
			}

			if ( isPartStrNotTag ) {
				Sizzle.filter( part, checkSet, true );
			}
		},
		">": function(checkSet, part, isXML){
			var isPartStr = typeof part === "string";

			if ( isPartStr && !/\W/.test(part) ) {
				part = isXML ? part : part.toUpperCase();

				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						var parent = elem.parentNode;
						checkSet[i] = parent.nodeName === part ? parent : false;
					}
				}
			} else {
				for ( var i = 0, l = checkSet.length; i < l; i++ ) {
					var elem = checkSet[i];
					if ( elem ) {
						checkSet[i] = isPartStr ?
							elem.parentNode :
							elem.parentNode === part;
					}
				}

				if ( isPartStr ) {
					Sizzle.filter( part, checkSet, true );
				}
			}
		},
		"": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("parentNode", part, doneName, checkSet, nodeCheck, isXML);
		},
		"~": function(checkSet, part, isXML){
			var doneName = done++, checkFn = dirCheck;

			if ( typeof part === "string" && !/\W/.test(part) ) {
				var nodeCheck = part = isXML ? part : part.toUpperCase();
				checkFn = dirNodeCheck;
			}

			checkFn("previousSibling", part, doneName, checkSet, nodeCheck, isXML);
		}
	},
	find: {
		ID: function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? [m] : [];
			}
		},
		NAME: function(match, context, isXML){
			if ( typeof context.getElementsByName !== "undefined" ) {
				var ret = [], results = context.getElementsByName(match[1]);

				for ( var i = 0, l = results.length; i < l; i++ ) {
					if ( results[i].getAttribute("name") === match[1] ) {
						ret.push( results[i] );
					}
				}

				return ret.length === 0 ? null : ret;
			}
		},
		TAG: function(match, context){
			return context.getElementsByTagName(match[1]);
		}
	},
	preFilter: {
		CLASS: function(match, curLoop, inplace, result, not, isXML){
			match = " " + match[1].replace(/\\/g, "") + " ";

			if ( isXML ) {
				return match;
			}

			for ( var i = 0, elem; (elem = curLoop[i]) != null; i++ ) {
				if ( elem ) {
					if ( not ^ (elem.className && (" " + elem.className + " ").indexOf(match) >= 0) ) {
						if ( !inplace )
							result.push( elem );
					} else if ( inplace ) {
						curLoop[i] = false;
					}
				}
			}

			return false;
		},
		ID: function(match){
			return match[1].replace(/\\/g, "");
		},
		TAG: function(match, curLoop){
			for ( var i = 0; curLoop[i] === false; i++ ){}
			return curLoop[i] && isXML(curLoop[i]) ? match[1] : match[1].toUpperCase();
		},
		CHILD: function(match){
			if ( match[1] == "nth" ) {
				var test = /(-?)(\d*)n((?:\+|-)?\d*)/.exec(
					match[2] == "even" && "2n" || match[2] == "odd" && "2n+1" ||
					!/\D/.test( match[2] ) && "0n+" + match[2] || match[2]);

				match[2] = (test[1] + (test[2] || 1)) - 0;
				match[3] = test[3] - 0;
			}

			match[0] = done++;

			return match;
		},
		ATTR: function(match, curLoop, inplace, result, not, isXML){
			var name = match[1].replace(/\\/g, "");

			if ( !isXML && Expr.attrMap[name] ) {
				match[1] = Expr.attrMap[name];
			}

			if ( match[2] === "~=" ) {
				match[4] = " " + match[4] + " ";
			}

			return match;
		},
		PSEUDO: function(match, curLoop, inplace, result, not){
			if ( match[1] === "not" ) {
				if ( ( chunker.exec(match[3]) || "" ).length > 1 || /^\w/.test(match[3]) ) {
					match[3] = Sizzle(match[3], null, null, curLoop);
				} else {
					var ret = Sizzle.filter(match[3], curLoop, inplace, true ^ not);
					if ( !inplace ) {
						result.push.apply( result, ret );
					}
					return false;
				}
			} else if ( Expr.match.POS.test( match[0] ) || Expr.match.CHILD.test( match[0] ) ) {
				return true;
			}

			return match;
		},
		POS: function(match){
			match.unshift( true );
			return match;
		}
	},
	filters: {
		enabled: function(elem){
			return elem.disabled === false && elem.type !== "hidden";
		},
		disabled: function(elem){
			return elem.disabled === true;
		},
		checked: function(elem){
			return elem.checked === true;
		},
		selected: function(elem){
			elem.parentNode.selectedIndex;
			return elem.selected === true;
		},
		parent: function(elem){
			return !!elem.firstChild;
		},
		empty: function(elem){
			return !elem.firstChild;
		},
		has: function(elem, i, match){
			return !!Sizzle( match[3], elem ).length;
		},
		header: function(elem){
			return /h\d/i.test( elem.nodeName );
		},
		text: function(elem){
			return "text" === elem.type;
		},
		radio: function(elem){
			return "radio" === elem.type;
		},
		checkbox: function(elem){
			return "checkbox" === elem.type;
		},
		file: function(elem){
			return "file" === elem.type;
		},
		password: function(elem){
			return "password" === elem.type;
		},
		submit: function(elem){
			return "submit" === elem.type;
		},
		image: function(elem){
			return "image" === elem.type;
		},
		reset: function(elem){
			return "reset" === elem.type;
		},
		button: function(elem){
			return "button" === elem.type || elem.nodeName.toUpperCase() === "BUTTON";
		},
		input: function(elem){
			return /input|select|textarea|button/i.test(elem.nodeName);
		}
	},
	setFilters: {
		first: function(elem, i){
			return i === 0;
		},
		last: function(elem, i, match, array){
			return i === array.length - 1;
		},
		even: function(elem, i){
			return i % 2 === 0;
		},
		odd: function(elem, i){
			return i % 2 === 1;
		},
		lt: function(elem, i, match){
			return i < match[3] - 0;
		},
		gt: function(elem, i, match){
			return i > match[3] - 0;
		},
		nth: function(elem, i, match){
			return match[3] - 0 == i;
		},
		eq: function(elem, i, match){
			return match[3] - 0 == i;
		}
	},
	filter: {
		PSEUDO: function(elem, match, i, array){
			var name = match[1], filter = Expr.filters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			} else if ( name === "contains" ) {
				return (elem.textContent || elem.innerText || "").indexOf(match[3]) >= 0;
			} else if ( name === "not" ) {
				var not = match[3];

				for ( var i = 0, l = not.length; i < l; i++ ) {
					if ( not[i] === elem ) {
						return false;
					}
				}

				return true;
			}
		},
		CHILD: function(elem, match){
			var type = match[1], node = elem;
			switch (type) {
				case 'only':
				case 'first':
					while ( (node = node.previousSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					if ( type == 'first') return true;
					node = elem;
				case 'last':
					while ( (node = node.nextSibling) )  {
						if ( node.nodeType === 1 ) return false;
					}
					return true;
				case 'nth':
					var first = match[2], last = match[3];

					if ( first == 1 && last == 0 ) {
						return true;
					}

					var doneName = match[0],
						parent = elem.parentNode;

					if ( parent && (parent.sizcache !== doneName || !elem.nodeIndex) ) {
						var count = 0;
						for ( node = parent.firstChild; node; node = node.nextSibling ) {
							if ( node.nodeType === 1 ) {
								node.nodeIndex = ++count;
							}
						}
						parent.sizcache = doneName;
					}

					var diff = elem.nodeIndex - last;
					if ( first == 0 ) {
						return diff == 0;
					} else {
						return ( diff % first == 0 && diff / first >= 0 );
					}
			}
		},
		ID: function(elem, match){
			return elem.nodeType === 1 && elem.getAttribute("id") === match;
		},
		TAG: function(elem, match){
			return (match === "*" && elem.nodeType === 1) || elem.nodeName === match;
		},
		CLASS: function(elem, match){
			return (" " + (elem.className || elem.getAttribute("class")) + " ")
				.indexOf( match ) > -1;
		},
		ATTR: function(elem, match){
			var name = match[1],
				result = Expr.attrHandle[ name ] ?
					Expr.attrHandle[ name ]( elem ) :
					elem[ name ] != null ?
						elem[ name ] :
						elem.getAttribute( name ),
				value = result + "",
				type = match[2],
				check = match[4];

			return result == null ?
				type === "!=" :
				type === "=" ?
				value === check :
				type === "*=" ?
				value.indexOf(check) >= 0 :
				type === "~=" ?
				(" " + value + " ").indexOf(check) >= 0 :
				!check ?
				value && result !== false :
				type === "!=" ?
				value != check :
				type === "^=" ?
				value.indexOf(check) === 0 :
				type === "$=" ?
				value.substr(value.length - check.length) === check :
				type === "|=" ?
				value === check || value.substr(0, check.length + 1) === check + "-" :
				false;
		},
		POS: function(elem, match, i, array){
			var name = match[2], filter = Expr.setFilters[ name ];

			if ( filter ) {
				return filter( elem, i, match, array );
			}
		}
	}
};

var origPOS = Expr.match.POS;

for ( var type in Expr.match ) {
	Expr.match[ type ] = new RegExp( Expr.match[ type ].source + /(?![^\[]*\])(?![^\(]*\))/.source );
	Expr.leftMatch[ type ] = new RegExp( /(^(?:.|\r|\n)*?)/.source + Expr.match[ type ].source );
}

var makeArray = function(array, results) {
	array = Array.prototype.slice.call( array, 0 );

	if ( results ) {
		results.push.apply( results, array );
		return results;
	}

	return array;
};

try {
	Array.prototype.slice.call( document.documentElement.childNodes, 0 );

} catch(e){
	makeArray = function(array, results) {
		var ret = results || [];

		if ( toString.call(array) === "[object Array]" ) {
			Array.prototype.push.apply( ret, array );
		} else {
			if ( typeof array.length === "number" ) {
				for ( var i = 0, l = array.length; i < l; i++ ) {
					ret.push( array[i] );
				}
			} else {
				for ( var i = 0; array[i]; i++ ) {
					ret.push( array[i] );
				}
			}
		}

		return ret;
	};
}

var sortOrder;

if ( document.documentElement.compareDocumentPosition ) {
	sortOrder = function( a, b ) {
		if ( !a.compareDocumentPosition || !b.compareDocumentPosition ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.compareDocumentPosition(b) & 4 ? -1 : a === b ? 0 : 1;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( "sourceIndex" in document.documentElement ) {
	sortOrder = function( a, b ) {
		if ( !a.sourceIndex || !b.sourceIndex ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var ret = a.sourceIndex - b.sourceIndex;
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
} else if ( document.createRange ) {
	sortOrder = function( a, b ) {
		if ( !a.ownerDocument || !b.ownerDocument ) {
			if ( a == b ) {
				hasDuplicate = true;
			}
			return 0;
		}

		var aRange = a.ownerDocument.createRange(), bRange = b.ownerDocument.createRange();
		aRange.setStart(a, 0);
		aRange.setEnd(a, 0);
		bRange.setStart(b, 0);
		bRange.setEnd(b, 0);
		var ret = aRange.compareBoundaryPoints(Range.START_TO_END, bRange);
		if ( ret === 0 ) {
			hasDuplicate = true;
		}
		return ret;
	};
}

(function(){
	var form = document.createElement("div"),
		id = "script" + (new Date).getTime();
	form.innerHTML = "<a name='" + id + "'/>";

	var root = document.documentElement;
	root.insertBefore( form, root.firstChild );

	if ( !!document.getElementById( id ) ) {
		Expr.find.ID = function(match, context, isXML){
			if ( typeof context.getElementById !== "undefined" && !isXML ) {
				var m = context.getElementById(match[1]);
				return m ? m.id === match[1] || typeof m.getAttributeNode !== "undefined" && m.getAttributeNode("id").nodeValue === match[1] ? [m] : undefined : [];
			}
		};

		Expr.filter.ID = function(elem, match){
			var node = typeof elem.getAttributeNode !== "undefined" && elem.getAttributeNode("id");
			return elem.nodeType === 1 && node && node.nodeValue === match;
		};
	}

	root.removeChild( form );
	root = form = null; // release memory in IE
})();

(function(){

	var div = document.createElement("div");
	div.appendChild( document.createComment("") );

	if ( div.getElementsByTagName("*").length > 0 ) {
		Expr.find.TAG = function(match, context){
			var results = context.getElementsByTagName(match[1]);

			if ( match[1] === "*" ) {
				var tmp = [];

				for ( var i = 0; results[i]; i++ ) {
					if ( results[i].nodeType === 1 ) {
						tmp.push( results[i] );
					}
				}

				results = tmp;
			}

			return results;
		};
	}

	div.innerHTML = "<a href='#'></a>";
	if ( div.firstChild && typeof div.firstChild.getAttribute !== "undefined" &&
			div.firstChild.getAttribute("href") !== "#" ) {
		Expr.attrHandle.href = function(elem){
			return elem.getAttribute("href", 2);
		};
	}

	div = null; // release memory in IE
})();

if ( document.querySelectorAll ) (function(){
	var oldSizzle = Sizzle, div = document.createElement("div");
	div.innerHTML = "<p class='TEST'></p>";

	if ( div.querySelectorAll && div.querySelectorAll(".TEST").length === 0 ) {
		return;
	}

	Sizzle = function(query, context, extra, seed){
		context = context || document;

		if ( !seed && context.nodeType === 9 && !isXML(context) ) {
			try {
				return makeArray( context.querySelectorAll(query), extra );
			} catch(e){}
		}

		return oldSizzle(query, context, extra, seed);
	};

	for ( var prop in oldSizzle ) {
		Sizzle[ prop ] = oldSizzle[ prop ];
	}

	div = null; // release memory in IE
})();

if ( document.getElementsByClassName && document.documentElement.getElementsByClassName ) (function(){
	var div = document.createElement("div");
	div.innerHTML = "<div class='test e'></div><div class='test'></div>";

	if ( div.getElementsByClassName("e").length === 0 )
		return;

	div.lastChild.className = "e";

	if ( div.getElementsByClassName("e").length === 1 )
		return;

	Expr.order.splice(1, 0, "CLASS");
	Expr.find.CLASS = function(match, context, isXML) {
		if ( typeof context.getElementsByClassName !== "undefined" && !isXML ) {
			return context.getElementsByClassName(match[1]);
		}
	};

	div = null; // release memory in IE
})();

function dirNodeCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ){
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 && !isXML ){
					elem.sizcache = doneName;
					elem.sizset = i;
				}

				if ( elem.nodeName === cur ) {
					match = elem;
					break;
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

function dirCheck( dir, cur, doneName, checkSet, nodeCheck, isXML ) {
	var sibDir = dir == "previousSibling" && !isXML;
	for ( var i = 0, l = checkSet.length; i < l; i++ ) {
		var elem = checkSet[i];
		if ( elem ) {
			if ( sibDir && elem.nodeType === 1 ) {
				elem.sizcache = doneName;
				elem.sizset = i;
			}
			elem = elem[dir];
			var match = false;

			while ( elem ) {
				if ( elem.sizcache === doneName ) {
					match = checkSet[elem.sizset];
					break;
				}

				if ( elem.nodeType === 1 ) {
					if ( !isXML ) {
						elem.sizcache = doneName;
						elem.sizset = i;
					}
					if ( typeof cur !== "string" ) {
						if ( elem === cur ) {
							match = true;
							break;
						}

					} else if ( Sizzle.filter( cur, [elem] ).length > 0 ) {
						match = elem;
						break;
					}
				}

				elem = elem[dir];
			}

			checkSet[i] = match;
		}
	}
}

var contains = document.compareDocumentPosition ?  function(a, b){
	return a.compareDocumentPosition(b) & 16;
} : function(a, b){
	return a !== b && (a.contains ? a.contains(b) : true);
};

var isXML = function(elem){
	return elem.nodeType === 9 && elem.documentElement.nodeName !== "HTML" ||
		!!elem.ownerDocument && elem.ownerDocument.documentElement.nodeName !== "HTML";
};

var posProcess = function(selector, context){
	var tmpSet = [], later = "", match,
		root = context.nodeType ? [context] : context;

	while ( (match = Expr.match.PSEUDO.exec( selector )) ) {
		later += match[0];
		selector = selector.replace( Expr.match.PSEUDO, "" );
	}

	selector = Expr.relative[selector] ? selector + "*" : selector;

	for ( var i = 0, l = root.length; i < l; i++ ) {
		Sizzle( selector, root[i], tmpSet );
	}

	return Sizzle.filter( later, tmpSet );
};


window.Sizzle = Sizzle;

})();

;(function(engine) {
  var extendElements = Prototype.Selector.extendElements;

  function select(selector, scope) {
    return extendElements(engine(selector, scope || document));
  }

  function match(element, selector) {
    return engine.matches(selector, [element]).length == 1;
  }

  Prototype.Selector.engine = engine;
  Prototype.Selector.select = select;
  Prototype.Selector.match = match;
})(Sizzle);

window.Sizzle = Prototype._original_property;
delete Prototype._original_property;

var Form = {
  reset: function(form) {
    form = $(form);
    form.reset();
    return form;
  },

  serializeElements: function(elements, options) {
    if (typeof options != 'object') options = { hash: !!options };
    else if (Object.isUndefined(options.hash)) options.hash = true;
    var key, value, submitted = false, submit = options.submit, accumulator, initial;

    if (options.hash) {
      initial = {};
      accumulator = function(result, key, value) {
        if (key in result) {
          if (!Object.isArray(result[key])) result[key] = [result[key]];
          result[key].push(value);
        } else result[key] = value;
        return result;
      };
    } else {
      initial = '';
      accumulator = function(result, key, value) {
        return result + (result ? '&' : '') + encodeURIComponent(key) + '=' + encodeURIComponent(value);
      }
    }

    return elements.inject(initial, function(result, element) {
      if (!element.disabled && element.name) {
        key = element.name; value = $(element).getValue();
        if (value != null && element.type != 'file' && (element.type != 'submit' || (!submitted &&
            submit !== false && (!submit || key == submit) && (submitted = true)))) {
          result = accumulator(result, key, value);
        }
      }
      return result;
    });
  }
};

Form.Methods = {
  serialize: function(form, options) {
    return Form.serializeElements(Form.getElements(form), options);
  },

  getElements: function(form) {
    var elements = $(form).getElementsByTagName('*'),
        element,
        arr = [ ],
        serializers = Form.Element.Serializers;
    for (var i = 0; element = elements[i]; i++) {
      arr.push(element);
    }
    return arr.inject([], function(elements, child) {
      if (serializers[child.tagName.toLowerCase()])
        elements.push(Element.extend(child));
      return elements;
    })
  },

  getInputs: function(form, typeName, name) {
    form = $(form);
    var inputs = form.getElementsByTagName('input');

    if (!typeName && !name) return $A(inputs).map(Element.extend);

    for (var i = 0, matchingInputs = [], length = inputs.length; i < length; i++) {
      var input = inputs[i];
      if ((typeName && input.type != typeName) || (name && input.name != name))
        continue;
      matchingInputs.push(Element.extend(input));
    }

    return matchingInputs;
  },

  disable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('disable');
    return form;
  },

  enable: function(form) {
    form = $(form);
    Form.getElements(form).invoke('enable');
    return form;
  },

  findFirstElement: function(form) {
    var elements = $(form).getElements().findAll(function(element) {
      return 'hidden' != element.type && !element.disabled;
    });
    var firstByIndex = elements.findAll(function(element) {
      return element.hasAttribute('tabIndex') && element.tabIndex >= 0;
    }).sortBy(function(element) { return element.tabIndex }).first();

    return firstByIndex ? firstByIndex : elements.find(function(element) {
      return /^(?:input|select|textarea)$/i.test(element.tagName);
    });
  },

  focusFirstElement: function(form) {
    form = $(form);
    var element = form.findFirstElement();
    if (element) element.activate();
    return form;
  },

  request: function(form, options) {
    form = $(form), options = Object.clone(options || { });

    var params = options.parameters, action = form.readAttribute('action') || '';
    if (action.blank()) action = window.location.href;
    options.parameters = form.serialize(true);

    if (params) {
      if (Object.isString(params)) params = params.toQueryParams();
      Object.extend(options.parameters, params);
    }

    if (form.hasAttribute('method') && !options.method)
      options.method = form.getAttribute('method');

    return new Ajax.Request(action, options);
  }
};

/*--------------------------------------------------------------------------*/


Form.Element = {
  focus: function(element) {
    $(element).focus();
    return element;
  },

  select: function(element) {
    $(element).select();
    return element;
  }
};

Form.Element.Methods = {

  serialize: function(element) {
    element = $(element);
    if (!element.disabled && element.name) {
      var value = element.getValue();
      if (value != undefined) {
        var pair = { };
        pair[element.name] = value;
        return Object.toQueryString(pair);
      }
    }
    return '';
  },

  getValue: function(element) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    return Form.Element.Serializers[method](element);
  },

  setValue: function(element, value) {
    element = $(element);
    var method = element.tagName.toLowerCase();
    Form.Element.Serializers[method](element, value);
    return element;
  },

  clear: function(element) {
    $(element).value = '';
    return element;
  },

  present: function(element) {
    return $(element).value != '';
  },

  activate: function(element) {
    element = $(element);
    try {
      element.focus();
      if (element.select && (element.tagName.toLowerCase() != 'input' ||
          !(/^(?:button|reset|submit)$/i.test(element.type))))
        element.select();
    } catch (e) { }
    return element;
  },

  disable: function(element) {
    element = $(element);
    element.disabled = true;
    return element;
  },

  enable: function(element) {
    element = $(element);
    element.disabled = false;
    return element;
  }
};

/*--------------------------------------------------------------------------*/

var Field = Form.Element;

var $F = Form.Element.Methods.getValue;

/*--------------------------------------------------------------------------*/

Form.Element.Serializers = (function() {
  function input(element, value) {
    switch (element.type.toLowerCase()) {
      case 'checkbox':
      case 'radio':
        return inputSelector(element, value);
      default:
        return valueSelector(element, value);
    }
  }

  function inputSelector(element, value) {
    if (Object.isUndefined(value))
      return element.checked ? element.value : null;
    else element.checked = !!value;
  }

  function valueSelector(element, value) {
    if (Object.isUndefined(value)) return element.value;
    else element.value = value;
  }

  function select(element, value) {
    if (Object.isUndefined(value))
      return (element.type === 'select-one' ? selectOne : selectMany)(element);

    var opt, currentValue, single = !Object.isArray(value);
    for (var i = 0, length = element.length; i < length; i++) {
      opt = element.options[i];
      currentValue = this.optionValue(opt);
      if (single) {
        if (currentValue == value) {
          opt.selected = true;
          return;
        }
      }
      else opt.selected = value.include(currentValue);
    }
  }

  function selectOne(element) {
    var index = element.selectedIndex;
    return index >= 0 ? optionValue(element.options[index]) : null;
  }

  function selectMany(element) {
    var values, length = element.length;
    if (!length) return null;

    for (var i = 0, values = []; i < length; i++) {
      var opt = element.options[i];
      if (opt.selected) values.push(optionValue(opt));
    }
    return values;
  }

  function optionValue(opt) {
    return Element.hasAttribute(opt, 'value') ? opt.value : opt.text;
  }

  return {
    input:         input,
    inputSelector: inputSelector,
    textarea:      valueSelector,
    select:        select,
    selectOne:     selectOne,
    selectMany:    selectMany,
    optionValue:   optionValue,
    button:        valueSelector
  };
})();

/*--------------------------------------------------------------------------*/


Abstract.TimedObserver = Class.create(PeriodicalExecuter, {
  initialize: function($super, element, frequency, callback) {
    $super(callback, frequency);
    this.element   = $(element);
    this.lastValue = this.getValue();
  },

  execute: function() {
    var value = this.getValue();
    if (Object.isString(this.lastValue) && Object.isString(value) ?
        this.lastValue != value : String(this.lastValue) != String(value)) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  }
});

Form.Element.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.Observer = Class.create(Abstract.TimedObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});

/*--------------------------------------------------------------------------*/

Abstract.EventObserver = Class.create({
  initialize: function(element, callback) {
    this.element  = $(element);
    this.callback = callback;

    this.lastValue = this.getValue();
    if (this.element.tagName.toLowerCase() == 'form')
      this.registerFormCallbacks();
    else
      this.registerCallback(this.element);
  },

  onElementEvent: function() {
    var value = this.getValue();
    if (this.lastValue != value) {
      this.callback(this.element, value);
      this.lastValue = value;
    }
  },

  registerFormCallbacks: function() {
    Form.getElements(this.element).each(this.registerCallback, this);
  },

  registerCallback: function(element) {
    if (element.type) {
      switch (element.type.toLowerCase()) {
        case 'checkbox':
        case 'radio':
          Event.observe(element, 'click', this.onElementEvent.bind(this));
          break;
        default:
          Event.observe(element, 'change', this.onElementEvent.bind(this));
          break;
      }
    }
  }
});

Form.Element.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.Element.getValue(this.element);
  }
});

Form.EventObserver = Class.create(Abstract.EventObserver, {
  getValue: function() {
    return Form.serialize(this.element);
  }
});
(function() {

  var Event = {
    KEY_BACKSPACE: 8,
    KEY_TAB:       9,
    KEY_RETURN:   13,
    KEY_ESC:      27,
    KEY_LEFT:     37,
    KEY_UP:       38,
    KEY_RIGHT:    39,
    KEY_DOWN:     40,
    KEY_DELETE:   46,
    KEY_HOME:     36,
    KEY_END:      35,
    KEY_PAGEUP:   33,
    KEY_PAGEDOWN: 34,
    KEY_INSERT:   45,

    cache: {}
  };

  var docEl = document.documentElement;
  var MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED = 'onmouseenter' in docEl
    && 'onmouseleave' in docEl;



  var isIELegacyEvent = function(event) { return false; };

  if (window.attachEvent) {
    if (window.addEventListener) {
      isIELegacyEvent = function(event) {
        return !(event instanceof window.Event);
      };
    } else {
      isIELegacyEvent = function(event) { return true; };
    }
  }

  var _isButton;

  function _isButtonForDOMEvents(event, code) {
    return event.which ? (event.which === code + 1) : (event.button === code);
  }

  var legacyButtonMap = { 0: 1, 1: 4, 2: 2 };
  function _isButtonForLegacyEvents(event, code) {
    return event.button === legacyButtonMap[code];
  }

  function _isButtonForWebKit(event, code) {
    switch (code) {
      case 0: return event.which == 1 && !event.metaKey;
      case 1: return event.which == 2 || (event.which == 1 && event.metaKey);
      case 2: return event.which == 3;
      default: return false;
    }
  }

  if (window.attachEvent) {
    if (!window.addEventListener) {
      _isButton = _isButtonForLegacyEvents;
    } else {
      _isButton = function(event, code) {
        return isIELegacyEvent(event) ? _isButtonForLegacyEvents(event, code) :
         _isButtonForDOMEvents(event, code);
      }
    }
  } else if (Prototype.Browser.WebKit) {
    _isButton = _isButtonForWebKit;
  } else {
    _isButton = _isButtonForDOMEvents;
  }

  function isLeftClick(event)   { return _isButton(event, 0) }

  function isMiddleClick(event) { return _isButton(event, 1) }

  function isRightClick(event)  { return _isButton(event, 2) }

  function element(event) {
    event = Event.extend(event);

    var node = event.target, type = event.type,
     currentTarget = event.currentTarget;

    if (currentTarget && currentTarget.tagName) {
      if (type === 'load' || type === 'error' ||
        (type === 'click' && currentTarget.tagName.toLowerCase() === 'input'
          && currentTarget.type === 'radio'))
            node = currentTarget;
    }

    if (node.nodeType == Node.TEXT_NODE)
      node = node.parentNode;

    return Element.extend(node);
  }

  function findElement(event, expression) {
    var element = Event.element(event);

    if (!expression) return element;
    while (element) {
      if (Object.isElement(element) && Prototype.Selector.match(element, expression)) {
        return Element.extend(element);
      }
      element = element.parentNode;
    }
  }

  function pointer(event) {
    return { x: pointerX(event), y: pointerY(event) };
  }

  function pointerX(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollLeft: 0 };

    return event.pageX || (event.clientX +
      (docElement.scrollLeft || body.scrollLeft) -
      (docElement.clientLeft || 0));
  }

  function pointerY(event) {
    var docElement = document.documentElement,
     body = document.body || { scrollTop: 0 };

    return  event.pageY || (event.clientY +
       (docElement.scrollTop || body.scrollTop) -
       (docElement.clientTop || 0));
  }


  function stop(event) {
    Event.extend(event);
    event.preventDefault();
    event.stopPropagation();

    event.stopped = true;
  }


  Event.Methods = {
    isLeftClick:   isLeftClick,
    isMiddleClick: isMiddleClick,
    isRightClick:  isRightClick,

    element:     element,
    findElement: findElement,

    pointer:  pointer,
    pointerX: pointerX,
    pointerY: pointerY,

    stop: stop
  };

  var methods = Object.keys(Event.Methods).inject({ }, function(m, name) {
    m[name] = Event.Methods[name].methodize();
    return m;
  });

  if (window.attachEvent) {
    function _relatedTarget(event) {
      var element;
      switch (event.type) {
        case 'mouseover':
        case 'mouseenter':
          element = event.fromElement;
          break;
        case 'mouseout':
        case 'mouseleave':
          element = event.toElement;
          break;
        default:
          return null;
      }
      return Element.extend(element);
    }

    var additionalMethods = {
      stopPropagation: function() { this.cancelBubble = true },
      preventDefault:  function() { this.returnValue = false },
      inspect: function() { return '[object Event]' }
    };

    Event.extend = function(event, element) {
      if (!event) return false;

      if (!isIELegacyEvent(event)) return event;

      if (event._extendedByPrototype) return event;
      event._extendedByPrototype = Prototype.emptyFunction;

      var pointer = Event.pointer(event);

      Object.extend(event, {
        target: event.srcElement || element,
        relatedTarget: _relatedTarget(event),
        pageX:  pointer.x,
        pageY:  pointer.y
      });

      Object.extend(event, methods);
      Object.extend(event, additionalMethods);

      return event;
    };
  } else {
    Event.extend = Prototype.K;
  }

  if (window.addEventListener) {
    Event.prototype = window.Event.prototype || document.createEvent('HTMLEvents').__proto__;
    Object.extend(Event.prototype, methods);
  }

  function _createResponder(element, eventName, handler) {
    var registry = Element.retrieve(element, 'prototype_event_registry');

    if (Object.isUndefined(registry)) {
      CACHE.push(element);
      registry = Element.retrieve(element, 'prototype_event_registry', $H());
    }

    var respondersForEvent = registry.get(eventName);
    if (Object.isUndefined(respondersForEvent)) {
      respondersForEvent = [];
      registry.set(eventName, respondersForEvent);
    }

    if (respondersForEvent.pluck('handler').include(handler)) return false;

    var responder;
    if (eventName.include(":")) {
      responder = function(event) {
        if (Object.isUndefined(event.eventName))
          return false;

        if (event.eventName !== eventName)
          return false;

        Event.extend(event, element);
        handler.call(element, event);
      };
    } else {
      if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED &&
       (eventName === "mouseenter" || eventName === "mouseleave")) {
        if (eventName === "mouseenter" || eventName === "mouseleave") {
          responder = function(event) {
            Event.extend(event, element);

            var parent = event.relatedTarget;
            while (parent && parent !== element) {
              try { parent = parent.parentNode; }
              catch(e) { parent = element; }
            }

            if (parent === element) return;

            handler.call(element, event);
          };
        }
      } else {
        if (eventName === "beforeunload")
        {
          responder = function(event) {
            Event.extend(event, element);
            return handler.call(element, event);
          };
        }
        else
        {
          responder = function(event) {
            Event.extend(event, element);
            handler.call(element, event);
          };
        }
      }
    }

    responder.handler = handler;
    respondersForEvent.push(responder);
    return responder;
  }

  function _destroyCache() {
    for (var i = 0, length = CACHE.length; i < length; i++) {
      Event.stopObserving(CACHE[i]);
      CACHE[i] = null;
    }
  }

  var CACHE = [];

  if (Prototype.Browser.IE)
    window.attachEvent('onunload', _destroyCache);

  if (Prototype.Browser.WebKit)
    window.addEventListener('unload', Prototype.emptyFunction, false);


  var _getDOMEventName = Prototype.K,
      translations = { mouseenter: "mouseover", mouseleave: "mouseout" };

  if (!MOUSEENTER_MOUSELEAVE_EVENTS_SUPPORTED) {
    _getDOMEventName = function(eventName) {
      return (translations[eventName] || eventName);
    };
  }

  function observe(element, eventName, handler) {
    element = $(element);

    var responder = _createResponder(element, eventName, handler);

    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.addEventListener)
        element.addEventListener("dataavailable", responder, false);
      else {
        element.attachEvent("ondataavailable", responder);
        element.attachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);

      if (element.addEventListener)
        element.addEventListener(actualEventName, responder, false);
      else
        element.attachEvent("on" + actualEventName, responder);
    }

    return element;
  }

  function stopObserving(element, eventName, handler) {
    element = $(element);

    var registry = Element.retrieve(element, 'prototype_event_registry');
    if (!registry) return element;

    if (!eventName) {
      registry.each( function(pair) {
        var eventName = pair.key;
        stopObserving(element, eventName);
      });
      return element;
    }

    var responders = registry.get(eventName);
    if (!responders) return element;

    if (!handler) {
      responders.each(function(r) {
        stopObserving(element, eventName, r.handler);
      });
      return element;
    }

    var i = responders.length, responder;
    while (i--) {
      if (responders[i].handler === handler) {
        responder = responders[i];
        break;
      }
    }
    if (!responder) return element;

    if (eventName.include(':')) {
      if (element.removeEventListener)
        element.removeEventListener("dataavailable", responder, false);
      else {
        element.detachEvent("ondataavailable", responder);
        element.detachEvent("onlosecapture", responder);
      }
    } else {
      var actualEventName = _getDOMEventName(eventName);
      if (element.removeEventListener)
        element.removeEventListener(actualEventName, responder, false);
      else
        element.detachEvent('on' + actualEventName, responder);
    }

    registry.set(eventName, responders.without(responder));

    return element;
  }

  function fire(element, eventName, memo, bubble) {
    element = $(element);

    if (Object.isUndefined(bubble))
      bubble = true;

    if (element == document && document.createEvent && !element.dispatchEvent)
      element = document.documentElement;

    var event;
    if (document.createEvent) {
      event = document.createEvent('HTMLEvents');
      event.initEvent('dataavailable', bubble, true);
    } else {
      event = document.createEventObject();
      event.eventType = bubble ? 'ondataavailable' : 'onlosecapture';
    }

    event.eventName = eventName;
    event.memo = memo || { };

    if (document.createEvent)
      element.dispatchEvent(event);
    else
      element.fireEvent(event.eventType, event);

    return Event.extend(event);
  }

  Event.Handler = Class.create({
    initialize: function(element, eventName, selector, callback) {
      this.element   = $(element);
      this.eventName = eventName;
      this.selector  = selector;
      this.callback  = callback;
      this.handler   = this.handleEvent.bind(this);
    },

    start: function() {
      Event.observe(this.element, this.eventName, this.handler);
      return this;
    },

    stop: function() {
      Event.stopObserving(this.element, this.eventName, this.handler);
      return this;
    },

    handleEvent: function(event) {
      var element = Event.findElement(event, this.selector);
      if (element) this.callback.call(this.element, event, element);
    }
  });

  function on(element, eventName, selector, callback) {
    element = $(element);
    if (Object.isFunction(selector) && Object.isUndefined(callback)) {
      callback = selector, selector = null;
    }

    return new Event.Handler(element, eventName, selector, callback).start();
  }

  Object.extend(Event, Event.Methods);

  Object.extend(Event, {
    fire:          fire,
    observe:       observe,
    stopObserving: stopObserving,
    on:            on
  });

  Element.addMethods({
    fire:          fire,

    observe:       observe,

    stopObserving: stopObserving,

    on:            on
  });

  Object.extend(document, {
    fire:          fire.methodize(),

    observe:       observe.methodize(),

    stopObserving: stopObserving.methodize(),

    on:            on.methodize(),

    loaded:        false
  });

  if (window.Event) Object.extend(window.Event, Event);
  else window.Event = Event;
})();

(function() {
  /* Support for the DOMContentLoaded event is based on work by Dan Webb,
     Matthias Miller, Dean Edwards, John Resig, and Diego Perini. */

  var timer;

  function fireContentLoadedEvent() {
    if (document.loaded) return;
    if (timer) window.clearTimeout(timer);
    document.loaded = true;
    document.fire('dom:loaded');
  }

  function checkReadyState() {
    if (document.readyState === 'complete') {
      document.stopObserving('readystatechange', checkReadyState);
      fireContentLoadedEvent();
    }
  }

  function pollDoScroll() {
    try { document.documentElement.doScroll('left'); }
    catch(e) {
      timer = pollDoScroll.defer();
      return;
    }
    fireContentLoadedEvent();
  }

  if (document.addEventListener) {
    document.addEventListener('DOMContentLoaded', fireContentLoadedEvent, false);
  } else {
    document.observe('readystatechange', checkReadyState);
    if (window == top)
      timer = pollDoScroll.defer();
  }

  Event.observe(window, 'load', fireContentLoadedEvent);
})();

Element.addMethods();

/*------------------------------- DEPRECATED -------------------------------*/

Hash.toQueryString = Object.toQueryString;

var Toggle = { display: Element.toggle };

Element.Methods.childOf = Element.Methods.descendantOf;

var Insertion = {
  Before: function(element, content) {
    return Element.insert(element, {before:content});
  },

  Top: function(element, content) {
    return Element.insert(element, {top:content});
  },

  Bottom: function(element, content) {
    return Element.insert(element, {bottom:content});
  },

  After: function(element, content) {
    return Element.insert(element, {after:content});
  }
};

var $continue = new Error('"throw $continue" is deprecated, use "return" instead');

var Position = {
  includeScrollOffsets: false,

  prepare: function() {
    this.deltaX =  window.pageXOffset
                || document.documentElement.scrollLeft
                || document.body.scrollLeft
                || 0;
    this.deltaY =  window.pageYOffset
                || document.documentElement.scrollTop
                || document.body.scrollTop
                || 0;
  },

  within: function(element, x, y) {
    if (this.includeScrollOffsets)
      return this.withinIncludingScrolloffsets(element, x, y);
    this.xcomp = x;
    this.ycomp = y;
    this.offset = Element.cumulativeOffset(element);

    return (y >= this.offset[1] &&
            y <  this.offset[1] + element.offsetHeight &&
            x >= this.offset[0] &&
            x <  this.offset[0] + element.offsetWidth);
  },

  withinIncludingScrolloffsets: function(element, x, y) {
    var offsetcache = Element.cumulativeScrollOffset(element);

    this.xcomp = x + offsetcache[0] - this.deltaX;
    this.ycomp = y + offsetcache[1] - this.deltaY;
    this.offset = Element.cumulativeOffset(element);

    return (this.ycomp >= this.offset[1] &&
            this.ycomp <  this.offset[1] + element.offsetHeight &&
            this.xcomp >= this.offset[0] &&
            this.xcomp <  this.offset[0] + element.offsetWidth);
  },

  overlap: function(mode, element) {
    if (!mode) return 0;
    if (mode == 'vertical')
      return ((this.offset[1] + element.offsetHeight) - this.ycomp) /
        element.offsetHeight;
    if (mode == 'horizontal')
      return ((this.offset[0] + element.offsetWidth) - this.xcomp) /
        element.offsetWidth;
  },


  cumulativeOffset: Element.Methods.cumulativeOffset,

  positionedOffset: Element.Methods.positionedOffset,

  absolutize: function(element) {
    Position.prepare();
    return Element.absolutize(element);
  },

  relativize: function(element) {
    Position.prepare();
    return Element.relativize(element);
  },

  realOffset: Element.Methods.cumulativeScrollOffset,

  offsetParent: Element.Methods.getOffsetParent,

  page: Element.Methods.viewportOffset,

  clone: function(source, target, options) {
    options = options || { };
    return Element.clonePosition(target, source, options);
  }
};

/*--------------------------------------------------------------------------*/

if (!document.getElementsByClassName) document.getElementsByClassName = function(instanceMethods){
  function iter(name) {
    return name.blank() ? null : "[contains(concat(' ', @class, ' '), ' " + name + " ')]";
  }

  var _getElementsByClassName = instanceMethods.getElementsByClassName = Prototype.BrowserFeatures.XPath ?
  function(element, className) {
    className = className.toString().strip();
    var cond = /\s/.test(className) ? $w(className).map(iter).join('') : iter(className);
    return cond ? document._getElementsByXPath('.//*' + cond, element) : [];
  } : function(element, className) {
    className = className.toString().strip();
    var elements = [], classNames = (/\s/.test(className) ? $w(className) : null);
    if (!classNames && !className) return elements;

    var nodes = $(element).getElementsByTagName('*');
    className = ' ' + className + ' ';

    for (var i = 0, child, cn; child = nodes[i]; i++) {
      if (child.className && (cn = ' ' + child.className + ' ') && (cn.include(className) ||
          (classNames && classNames.all(function(name) {
            return !name.toString().blank() && cn.include(' ' + name + ' ');
          }))))
        elements.push(Element.extend(child));
    }
    return elements;
  };

  return function(className, parentElement) {
    return _getElementsByClassName( parentElement || document.body, className );
  };
}(Element.Methods);

/*--------------------------------------------------------------------------*/

Element.ClassNames = Class.create();
Element.ClassNames.prototype = {
  initialize: function(element) {
    this.element = $(element);
  },

  _each: function(iterator) {
    this.element.className.split(/\s+/).select(function(name) {
      return name.length > 0;
    })._each(iterator);
  },

  set: function(className) {
    this.element.className = className;
  },

  add: function(classNameToAdd) {
    if (this.include(classNameToAdd)) return;
    this.set($A(this).concat(classNameToAdd).join(' '));
  },

  remove: function(classNameToRemove) {
    if (!this.include(classNameToRemove)) return;
    this.set($A(this).without(classNameToRemove).join(' '));
  },

  toString: function() {
    return $A(this).join(' ');
  }
};

Object.extend(Element.ClassNames.prototype, Enumerable);

/*--------------------------------------------------------------------------*/

(function() {
  window.Selector = Class.create({
    initialize: function(expression) {
      this.expression = expression.strip();
    },

    findElements: function(rootElement) {
      return Prototype.Selector.select(this.expression, rootElement);
    },

    match: function(element) {
      return Prototype.Selector.match(element, this.expression);
    },

    toString: function() {
      return this.expression;
    },

    inspect: function() {
      return "#<Selector: " + this.expression + ">";
    }
  });

  Object.extend(Selector, {
    matchElements: function(elements, expression) {
      var match = Prototype.Selector.match,
          results = [];

      for (var i = 0, length = elements.length; i < length; i++) {
        var element = elements[i];
        if (match(element, expression)) {
          results.push(Element.extend(element));
        }
      }
      return results;
    },

    findElement: function(elements, expression, index) {
      index = index || 0;
      var matchIndex = 0, element;
      for (var i = 0, length = elements.length; i < length; i++) {
        element = elements[i];
        if (Prototype.Selector.match(element, expression) && index === matchIndex++) {
          return Element.extend(element);
        }
      }
    },

    findChildElements: function(element, expressions) {
      var selector = expressions.toArray().join(', ');
      return Prototype.Selector.select(selector, element || document);
    }
  });
})();
/*! jQuery v1.10.2 | (c) 2005, 2013 jQuery Foundation, Inc. | jquery.org/license
//@ sourceMappingURL=jquery-1.10.2.min.map
*/
(function(e,t){var n,r,i=typeof t,o=e.location,a=e.document,s=a.documentElement,l=e.jQuery,u=e.$,c={},p=[],f="1.10.2",d=p.concat,h=p.push,g=p.slice,m=p.indexOf,y=c.toString,v=c.hasOwnProperty,b=f.trim,x=function(e,t){return new x.fn.init(e,t,r)},w=/[+-]?(?:\d*\.|)\d+(?:[eE][+-]?\d+|)/.source,T=/\S+/g,C=/^[\s\uFEFF\xA0]+|[\s\uFEFF\xA0]+$/g,N=/^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]*))$/,k=/^<(\w+)\s*\/?>(?:<\/\1>|)$/,E=/^[\],:{}\s]*$/,S=/(?:^|:|,)(?:\s*\[)+/g,A=/\\(?:["\\\/bfnrt]|u[\da-fA-F]{4})/g,j=/"[^"\\\r\n]*"|true|false|null|-?(?:\d+\.|)\d+(?:[eE][+-]?\d+|)/g,D=/^-ms-/,L=/-([\da-z])/gi,H=function(e,t){return t.toUpperCase()},q=function(e){(a.addEventListener||"load"===e.type||"complete"===a.readyState)&&(_(),x.ready())},_=function(){a.addEventListener?(a.removeEventListener("DOMContentLoaded",q,!1),e.removeEventListener("load",q,!1)):(a.detachEvent("onreadystatechange",q),e.detachEvent("onload",q))};x.fn=x.prototype={jquery:f,constructor:x,init:function(e,n,r){var i,o;if(!e)return this;if("string"==typeof e){if(i="<"===e.charAt(0)&&">"===e.charAt(e.length-1)&&e.length>=3?[null,e,null]:N.exec(e),!i||!i[1]&&n)return!n||n.jquery?(n||r).find(e):this.constructor(n).find(e);if(i[1]){if(n=n instanceof x?n[0]:n,x.merge(this,x.parseHTML(i[1],n&&n.nodeType?n.ownerDocument||n:a,!0)),k.test(i[1])&&x.isPlainObject(n))for(i in n)x.isFunction(this[i])?this[i](n[i]):this.attr(i,n[i]);return this}if(o=a.getElementById(i[2]),o&&o.parentNode){if(o.id!==i[2])return r.find(e);this.length=1,this[0]=o}return this.context=a,this.selector=e,this}return e.nodeType?(this.context=this[0]=e,this.length=1,this):x.isFunction(e)?r.ready(e):(e.selector!==t&&(this.selector=e.selector,this.context=e.context),x.makeArray(e,this))},selector:"",length:0,toArray:function(){return g.call(this)},get:function(e){return null==e?this.toArray():0>e?this[this.length+e]:this[e]},pushStack:function(e){var t=x.merge(this.constructor(),e);return t.prevObject=this,t.context=this.context,t},each:function(e,t){return x.each(this,e,t)},ready:function(e){return x.ready.promise().done(e),this},slice:function(){return this.pushStack(g.apply(this,arguments))},first:function(){return this.eq(0)},last:function(){return this.eq(-1)},eq:function(e){var t=this.length,n=+e+(0>e?t:0);return this.pushStack(n>=0&&t>n?[this[n]]:[])},map:function(e){return this.pushStack(x.map(this,function(t,n){return e.call(t,n,t)}))},end:function(){return this.prevObject||this.constructor(null)},push:h,sort:[].sort,splice:[].splice},x.fn.init.prototype=x.fn,x.extend=x.fn.extend=function(){var e,n,r,i,o,a,s=arguments[0]||{},l=1,u=arguments.length,c=!1;for("boolean"==typeof s&&(c=s,s=arguments[1]||{},l=2),"object"==typeof s||x.isFunction(s)||(s={}),u===l&&(s=this,--l);u>l;l++)if(null!=(o=arguments[l]))for(i in o)e=s[i],r=o[i],s!==r&&(c&&r&&(x.isPlainObject(r)||(n=x.isArray(r)))?(n?(n=!1,a=e&&x.isArray(e)?e:[]):a=e&&x.isPlainObject(e)?e:{},s[i]=x.extend(c,a,r)):r!==t&&(s[i]=r));return s},x.extend({expando:"jQuery"+(f+Math.random()).replace(/\D/g,""),noConflict:function(t){return e.$===x&&(e.$=u),t&&e.jQuery===x&&(e.jQuery=l),x},isReady:!1,readyWait:1,holdReady:function(e){e?x.readyWait++:x.ready(!0)},ready:function(e){if(e===!0?!--x.readyWait:!x.isReady){if(!a.body)return setTimeout(x.ready);x.isReady=!0,e!==!0&&--x.readyWait>0||(n.resolveWith(a,[x]),x.fn.trigger&&x(a).trigger("ready").off("ready"))}},isFunction:function(e){return"function"===x.type(e)},isArray:Array.isArray||function(e){return"array"===x.type(e)},isWindow:function(e){return null!=e&&e==e.window},isNumeric:function(e){return!isNaN(parseFloat(e))&&isFinite(e)},type:function(e){return null==e?e+"":"object"==typeof e||"function"==typeof e?c[y.call(e)]||"object":typeof e},isPlainObject:function(e){var n;if(!e||"object"!==x.type(e)||e.nodeType||x.isWindow(e))return!1;try{if(e.constructor&&!v.call(e,"constructor")&&!v.call(e.constructor.prototype,"isPrototypeOf"))return!1}catch(r){return!1}if(x.support.ownLast)for(n in e)return v.call(e,n);for(n in e);return n===t||v.call(e,n)},isEmptyObject:function(e){var t;for(t in e)return!1;return!0},error:function(e){throw Error(e)},parseHTML:function(e,t,n){if(!e||"string"!=typeof e)return null;"boolean"==typeof t&&(n=t,t=!1),t=t||a;var r=k.exec(e),i=!n&&[];return r?[t.createElement(r[1])]:(r=x.buildFragment([e],t,i),i&&x(i).remove(),x.merge([],r.childNodes))},parseJSON:function(n){return e.JSON&&e.JSON.parse?e.JSON.parse(n):null===n?n:"string"==typeof n&&(n=x.trim(n),n&&E.test(n.replace(A,"@").replace(j,"]").replace(S,"")))?Function("return "+n)():(x.error("Invalid JSON: "+n),t)},parseXML:function(n){var r,i;if(!n||"string"!=typeof n)return null;try{e.DOMParser?(i=new DOMParser,r=i.parseFromString(n,"text/xml")):(r=new ActiveXObject("Microsoft.XMLDOM"),r.async="false",r.loadXML(n))}catch(o){r=t}return r&&r.documentElement&&!r.getElementsByTagName("parsererror").length||x.error("Invalid XML: "+n),r},noop:function(){},globalEval:function(t){t&&x.trim(t)&&(e.execScript||function(t){e.eval.call(e,t)})(t)},camelCase:function(e){return e.replace(D,"ms-").replace(L,H)},nodeName:function(e,t){return e.nodeName&&e.nodeName.toLowerCase()===t.toLowerCase()},each:function(e,t,n){var r,i=0,o=e.length,a=M(e);if(n){if(a){for(;o>i;i++)if(r=t.apply(e[i],n),r===!1)break}else for(i in e)if(r=t.apply(e[i],n),r===!1)break}else if(a){for(;o>i;i++)if(r=t.call(e[i],i,e[i]),r===!1)break}else for(i in e)if(r=t.call(e[i],i,e[i]),r===!1)break;return e},trim:b&&!b.call("\ufeff\u00a0")?function(e){return null==e?"":b.call(e)}:function(e){return null==e?"":(e+"").replace(C,"")},makeArray:function(e,t){var n=t||[];return null!=e&&(M(Object(e))?x.merge(n,"string"==typeof e?[e]:e):h.call(n,e)),n},inArray:function(e,t,n){var r;if(t){if(m)return m.call(t,e,n);for(r=t.length,n=n?0>n?Math.max(0,r+n):n:0;r>n;n++)if(n in t&&t[n]===e)return n}return-1},merge:function(e,n){var r=n.length,i=e.length,o=0;if("number"==typeof r)for(;r>o;o++)e[i++]=n[o];else while(n[o]!==t)e[i++]=n[o++];return e.length=i,e},grep:function(e,t,n){var r,i=[],o=0,a=e.length;for(n=!!n;a>o;o++)r=!!t(e[o],o),n!==r&&i.push(e[o]);return i},map:function(e,t,n){var r,i=0,o=e.length,a=M(e),s=[];if(a)for(;o>i;i++)r=t(e[i],i,n),null!=r&&(s[s.length]=r);else for(i in e)r=t(e[i],i,n),null!=r&&(s[s.length]=r);return d.apply([],s)},guid:1,proxy:function(e,n){var r,i,o;return"string"==typeof n&&(o=e[n],n=e,e=o),x.isFunction(e)?(r=g.call(arguments,2),i=function(){return e.apply(n||this,r.concat(g.call(arguments)))},i.guid=e.guid=e.guid||x.guid++,i):t},access:function(e,n,r,i,o,a,s){var l=0,u=e.length,c=null==r;if("object"===x.type(r)){o=!0;for(l in r)x.access(e,n,l,r[l],!0,a,s)}else if(i!==t&&(o=!0,x.isFunction(i)||(s=!0),c&&(s?(n.call(e,i),n=null):(c=n,n=function(e,t,n){return c.call(x(e),n)})),n))for(;u>l;l++)n(e[l],r,s?i:i.call(e[l],l,n(e[l],r)));return o?e:c?n.call(e):u?n(e[0],r):a},now:function(){return(new Date).getTime()},swap:function(e,t,n,r){var i,o,a={};for(o in t)a[o]=e.style[o],e.style[o]=t[o];i=n.apply(e,r||[]);for(o in t)e.style[o]=a[o];return i}}),x.ready.promise=function(t){if(!n)if(n=x.Deferred(),"complete"===a.readyState)setTimeout(x.ready);else if(a.addEventListener)a.addEventListener("DOMContentLoaded",q,!1),e.addEventListener("load",q,!1);else{a.attachEvent("onreadystatechange",q),e.attachEvent("onload",q);var r=!1;try{r=null==e.frameElement&&a.documentElement}catch(i){}r&&r.doScroll&&function o(){if(!x.isReady){try{r.doScroll("left")}catch(e){return setTimeout(o,50)}_(),x.ready()}}()}return n.promise(t)},x.each("Boolean Number String Function Array Date RegExp Object Error".split(" "),function(e,t){c["[object "+t+"]"]=t.toLowerCase()});function M(e){var t=e.length,n=x.type(e);return x.isWindow(e)?!1:1===e.nodeType&&t?!0:"array"===n||"function"!==n&&(0===t||"number"==typeof t&&t>0&&t-1 in e)}r=x(a),function(e,t){var n,r,i,o,a,s,l,u,c,p,f,d,h,g,m,y,v,b="sizzle"+-new Date,w=e.document,T=0,C=0,N=st(),k=st(),E=st(),S=!1,A=function(e,t){return e===t?(S=!0,0):0},j=typeof t,D=1<<31,L={}.hasOwnProperty,H=[],q=H.pop,_=H.push,M=H.push,O=H.slice,F=H.indexOf||function(e){var t=0,n=this.length;for(;n>t;t++)if(this[t]===e)return t;return-1},B="checked|selected|async|autofocus|autoplay|controls|defer|disabled|hidden|ismap|loop|multiple|open|readonly|required|scoped",P="[\\x20\\t\\r\\n\\f]",R="(?:\\\\.|[\\w-]|[^\\x00-\\xa0])+",W=R.replace("w","w#"),$="\\["+P+"*("+R+")"+P+"*(?:([*^$|!~]?=)"+P+"*(?:(['\"])((?:\\\\.|[^\\\\])*?)\\3|("+W+")|)|)"+P+"*\\]",I=":("+R+")(?:\\(((['\"])((?:\\\\.|[^\\\\])*?)\\3|((?:\\\\.|[^\\\\()[\\]]|"+$.replace(3,8)+")*)|.*)\\)|)",z=RegExp("^"+P+"+|((?:^|[^\\\\])(?:\\\\.)*)"+P+"+$","g"),X=RegExp("^"+P+"*,"+P+"*"),U=RegExp("^"+P+"*([>+~]|"+P+")"+P+"*"),V=RegExp(P+"*[+~]"),Y=RegExp("="+P+"*([^\\]'\"]*)"+P+"*\\]","g"),J=RegExp(I),G=RegExp("^"+W+"$"),Q={ID:RegExp("^#("+R+")"),CLASS:RegExp("^\\.("+R+")"),TAG:RegExp("^("+R.replace("w","w*")+")"),ATTR:RegExp("^"+$),PSEUDO:RegExp("^"+I),CHILD:RegExp("^:(only|first|last|nth|nth-last)-(child|of-type)(?:\\("+P+"*(even|odd|(([+-]|)(\\d*)n|)"+P+"*(?:([+-]|)"+P+"*(\\d+)|))"+P+"*\\)|)","i"),bool:RegExp("^(?:"+B+")$","i"),needsContext:RegExp("^"+P+"*[>+~]|:(even|odd|eq|gt|lt|nth|first|last)(?:\\("+P+"*((?:-\\d)?\\d*)"+P+"*\\)|)(?=[^-]|$)","i")},K=/^[^{]+\{\s*\[native \w/,Z=/^(?:#([\w-]+)|(\w+)|\.([\w-]+))$/,et=/^(?:input|select|textarea|button)$/i,tt=/^h\d$/i,nt=/'|\\/g,rt=RegExp("\\\\([\\da-f]{1,6}"+P+"?|("+P+")|.)","ig"),it=function(e,t,n){var r="0x"+t-65536;return r!==r||n?t:0>r?String.fromCharCode(r+65536):String.fromCharCode(55296|r>>10,56320|1023&r)};try{M.apply(H=O.call(w.childNodes),w.childNodes),H[w.childNodes.length].nodeType}catch(ot){M={apply:H.length?function(e,t){_.apply(e,O.call(t))}:function(e,t){var n=e.length,r=0;while(e[n++]=t[r++]);e.length=n-1}}}function at(e,t,n,i){var o,a,s,l,u,c,d,m,y,x;if((t?t.ownerDocument||t:w)!==f&&p(t),t=t||f,n=n||[],!e||"string"!=typeof e)return n;if(1!==(l=t.nodeType)&&9!==l)return[];if(h&&!i){if(o=Z.exec(e))if(s=o[1]){if(9===l){if(a=t.getElementById(s),!a||!a.parentNode)return n;if(a.id===s)return n.push(a),n}else if(t.ownerDocument&&(a=t.ownerDocument.getElementById(s))&&v(t,a)&&a.id===s)return n.push(a),n}else{if(o[2])return M.apply(n,t.getElementsByTagName(e)),n;if((s=o[3])&&r.getElementsByClassName&&t.getElementsByClassName)return M.apply(n,t.getElementsByClassName(s)),n}if(r.qsa&&(!g||!g.test(e))){if(m=d=b,y=t,x=9===l&&e,1===l&&"object"!==t.nodeName.toLowerCase()){c=mt(e),(d=t.getAttribute("id"))?m=d.replace(nt,"\\$&"):t.setAttribute("id",m),m="[id='"+m+"'] ",u=c.length;while(u--)c[u]=m+yt(c[u]);y=V.test(e)&&t.parentNode||t,x=c.join(",")}if(x)try{return M.apply(n,y.querySelectorAll(x)),n}catch(T){}finally{d||t.removeAttribute("id")}}}return kt(e.replace(z,"$1"),t,n,i)}function st(){var e=[];function t(n,r){return e.push(n+=" ")>o.cacheLength&&delete t[e.shift()],t[n]=r}return t}function lt(e){return e[b]=!0,e}function ut(e){var t=f.createElement("div");try{return!!e(t)}catch(n){return!1}finally{t.parentNode&&t.parentNode.removeChild(t),t=null}}function ct(e,t){var n=e.split("|"),r=e.length;while(r--)o.attrHandle[n[r]]=t}function pt(e,t){var n=t&&e,r=n&&1===e.nodeType&&1===t.nodeType&&(~t.sourceIndex||D)-(~e.sourceIndex||D);if(r)return r;if(n)while(n=n.nextSibling)if(n===t)return-1;return e?1:-1}function ft(e){return function(t){var n=t.nodeName.toLowerCase();return"input"===n&&t.type===e}}function dt(e){return function(t){var n=t.nodeName.toLowerCase();return("input"===n||"button"===n)&&t.type===e}}function ht(e){return lt(function(t){return t=+t,lt(function(n,r){var i,o=e([],n.length,t),a=o.length;while(a--)n[i=o[a]]&&(n[i]=!(r[i]=n[i]))})})}s=at.isXML=function(e){var t=e&&(e.ownerDocument||e).documentElement;return t?"HTML"!==t.nodeName:!1},r=at.support={},p=at.setDocument=function(e){var n=e?e.ownerDocument||e:w,i=n.defaultView;return n!==f&&9===n.nodeType&&n.documentElement?(f=n,d=n.documentElement,h=!s(n),i&&i.attachEvent&&i!==i.top&&i.attachEvent("onbeforeunload",function(){p()}),r.attributes=ut(function(e){return e.className="i",!e.getAttribute("className")}),r.getElementsByTagName=ut(function(e){return e.appendChild(n.createComment("")),!e.getElementsByTagName("*").length}),r.getElementsByClassName=ut(function(e){return e.innerHTML="<div class='a'></div><div class='a i'></div>",e.firstChild.className="i",2===e.getElementsByClassName("i").length}),r.getById=ut(function(e){return d.appendChild(e).id=b,!n.getElementsByName||!n.getElementsByName(b).length}),r.getById?(o.find.ID=function(e,t){if(typeof t.getElementById!==j&&h){var n=t.getElementById(e);return n&&n.parentNode?[n]:[]}},o.filter.ID=function(e){var t=e.replace(rt,it);return function(e){return e.getAttribute("id")===t}}):(delete o.find.ID,o.filter.ID=function(e){var t=e.replace(rt,it);return function(e){var n=typeof e.getAttributeNode!==j&&e.getAttributeNode("id");return n&&n.value===t}}),o.find.TAG=r.getElementsByTagName?function(e,n){return typeof n.getElementsByTagName!==j?n.getElementsByTagName(e):t}:function(e,t){var n,r=[],i=0,o=t.getElementsByTagName(e);if("*"===e){while(n=o[i++])1===n.nodeType&&r.push(n);return r}return o},o.find.CLASS=r.getElementsByClassName&&function(e,n){return typeof n.getElementsByClassName!==j&&h?n.getElementsByClassName(e):t},m=[],g=[],(r.qsa=K.test(n.querySelectorAll))&&(ut(function(e){e.innerHTML="<select><option selected=''></option></select>",e.querySelectorAll("[selected]").length||g.push("\\["+P+"*(?:value|"+B+")"),e.querySelectorAll(":checked").length||g.push(":checked")}),ut(function(e){var t=n.createElement("input");t.setAttribute("type","hidden"),e.appendChild(t).setAttribute("t",""),e.querySelectorAll("[t^='']").length&&g.push("[*^$]="+P+"*(?:''|\"\")"),e.querySelectorAll(":enabled").length||g.push(":enabled",":disabled"),e.querySelectorAll("*,:x"),g.push(",.*:")})),(r.matchesSelector=K.test(y=d.webkitMatchesSelector||d.mozMatchesSelector||d.oMatchesSelector||d.msMatchesSelector))&&ut(function(e){r.disconnectedMatch=y.call(e,"div"),y.call(e,"[s!='']:x"),m.push("!=",I)}),g=g.length&&RegExp(g.join("|")),m=m.length&&RegExp(m.join("|")),v=K.test(d.contains)||d.compareDocumentPosition?function(e,t){var n=9===e.nodeType?e.documentElement:e,r=t&&t.parentNode;return e===r||!(!r||1!==r.nodeType||!(n.contains?n.contains(r):e.compareDocumentPosition&&16&e.compareDocumentPosition(r)))}:function(e,t){if(t)while(t=t.parentNode)if(t===e)return!0;return!1},A=d.compareDocumentPosition?function(e,t){if(e===t)return S=!0,0;var i=t.compareDocumentPosition&&e.compareDocumentPosition&&e.compareDocumentPosition(t);return i?1&i||!r.sortDetached&&t.compareDocumentPosition(e)===i?e===n||v(w,e)?-1:t===n||v(w,t)?1:c?F.call(c,e)-F.call(c,t):0:4&i?-1:1:e.compareDocumentPosition?-1:1}:function(e,t){var r,i=0,o=e.parentNode,a=t.parentNode,s=[e],l=[t];if(e===t)return S=!0,0;if(!o||!a)return e===n?-1:t===n?1:o?-1:a?1:c?F.call(c,e)-F.call(c,t):0;if(o===a)return pt(e,t);r=e;while(r=r.parentNode)s.unshift(r);r=t;while(r=r.parentNode)l.unshift(r);while(s[i]===l[i])i++;return i?pt(s[i],l[i]):s[i]===w?-1:l[i]===w?1:0},n):f},at.matches=function(e,t){return at(e,null,null,t)},at.matchesSelector=function(e,t){if((e.ownerDocument||e)!==f&&p(e),t=t.replace(Y,"='$1']"),!(!r.matchesSelector||!h||m&&m.test(t)||g&&g.test(t)))try{var n=y.call(e,t);if(n||r.disconnectedMatch||e.document&&11!==e.document.nodeType)return n}catch(i){}return at(t,f,null,[e]).length>0},at.contains=function(e,t){return(e.ownerDocument||e)!==f&&p(e),v(e,t)},at.attr=function(e,n){(e.ownerDocument||e)!==f&&p(e);var i=o.attrHandle[n.toLowerCase()],a=i&&L.call(o.attrHandle,n.toLowerCase())?i(e,n,!h):t;return a===t?r.attributes||!h?e.getAttribute(n):(a=e.getAttributeNode(n))&&a.specified?a.value:null:a},at.error=function(e){throw Error("Syntax error, unrecognized expression: "+e)},at.uniqueSort=function(e){var t,n=[],i=0,o=0;if(S=!r.detectDuplicates,c=!r.sortStable&&e.slice(0),e.sort(A),S){while(t=e[o++])t===e[o]&&(i=n.push(o));while(i--)e.splice(n[i],1)}return e},a=at.getText=function(e){var t,n="",r=0,i=e.nodeType;if(i){if(1===i||9===i||11===i){if("string"==typeof e.textContent)return e.textContent;for(e=e.firstChild;e;e=e.nextSibling)n+=a(e)}else if(3===i||4===i)return e.nodeValue}else for(;t=e[r];r++)n+=a(t);return n},o=at.selectors={cacheLength:50,createPseudo:lt,match:Q,attrHandle:{},find:{},relative:{">":{dir:"parentNode",first:!0}," ":{dir:"parentNode"},"+":{dir:"previousSibling",first:!0},"~":{dir:"previousSibling"}},preFilter:{ATTR:function(e){return e[1]=e[1].replace(rt,it),e[3]=(e[4]||e[5]||"").replace(rt,it),"~="===e[2]&&(e[3]=" "+e[3]+" "),e.slice(0,4)},CHILD:function(e){return e[1]=e[1].toLowerCase(),"nth"===e[1].slice(0,3)?(e[3]||at.error(e[0]),e[4]=+(e[4]?e[5]+(e[6]||1):2*("even"===e[3]||"odd"===e[3])),e[5]=+(e[7]+e[8]||"odd"===e[3])):e[3]&&at.error(e[0]),e},PSEUDO:function(e){var n,r=!e[5]&&e[2];return Q.CHILD.test(e[0])?null:(e[3]&&e[4]!==t?e[2]=e[4]:r&&J.test(r)&&(n=mt(r,!0))&&(n=r.indexOf(")",r.length-n)-r.length)&&(e[0]=e[0].slice(0,n),e[2]=r.slice(0,n)),e.slice(0,3))}},filter:{TAG:function(e){var t=e.replace(rt,it).toLowerCase();return"*"===e?function(){return!0}:function(e){return e.nodeName&&e.nodeName.toLowerCase()===t}},CLASS:function(e){var t=N[e+" "];return t||(t=RegExp("(^|"+P+")"+e+"("+P+"|$)"))&&N(e,function(e){return t.test("string"==typeof e.className&&e.className||typeof e.getAttribute!==j&&e.getAttribute("class")||"")})},ATTR:function(e,t,n){return function(r){var i=at.attr(r,e);return null==i?"!="===t:t?(i+="","="===t?i===n:"!="===t?i!==n:"^="===t?n&&0===i.indexOf(n):"*="===t?n&&i.indexOf(n)>-1:"$="===t?n&&i.slice(-n.length)===n:"~="===t?(" "+i+" ").indexOf(n)>-1:"|="===t?i===n||i.slice(0,n.length+1)===n+"-":!1):!0}},CHILD:function(e,t,n,r,i){var o="nth"!==e.slice(0,3),a="last"!==e.slice(-4),s="of-type"===t;return 1===r&&0===i?function(e){return!!e.parentNode}:function(t,n,l){var u,c,p,f,d,h,g=o!==a?"nextSibling":"previousSibling",m=t.parentNode,y=s&&t.nodeName.toLowerCase(),v=!l&&!s;if(m){if(o){while(g){p=t;while(p=p[g])if(s?p.nodeName.toLowerCase()===y:1===p.nodeType)return!1;h=g="only"===e&&!h&&"nextSibling"}return!0}if(h=[a?m.firstChild:m.lastChild],a&&v){c=m[b]||(m[b]={}),u=c[e]||[],d=u[0]===T&&u[1],f=u[0]===T&&u[2],p=d&&m.childNodes[d];while(p=++d&&p&&p[g]||(f=d=0)||h.pop())if(1===p.nodeType&&++f&&p===t){c[e]=[T,d,f];break}}else if(v&&(u=(t[b]||(t[b]={}))[e])&&u[0]===T)f=u[1];else while(p=++d&&p&&p[g]||(f=d=0)||h.pop())if((s?p.nodeName.toLowerCase()===y:1===p.nodeType)&&++f&&(v&&((p[b]||(p[b]={}))[e]=[T,f]),p===t))break;return f-=i,f===r||0===f%r&&f/r>=0}}},PSEUDO:function(e,t){var n,r=o.pseudos[e]||o.setFilters[e.toLowerCase()]||at.error("unsupported pseudo: "+e);return r[b]?r(t):r.length>1?(n=[e,e,"",t],o.setFilters.hasOwnProperty(e.toLowerCase())?lt(function(e,n){var i,o=r(e,t),a=o.length;while(a--)i=F.call(e,o[a]),e[i]=!(n[i]=o[a])}):function(e){return r(e,0,n)}):r}},pseudos:{not:lt(function(e){var t=[],n=[],r=l(e.replace(z,"$1"));return r[b]?lt(function(e,t,n,i){var o,a=r(e,null,i,[]),s=e.length;while(s--)(o=a[s])&&(e[s]=!(t[s]=o))}):function(e,i,o){return t[0]=e,r(t,null,o,n),!n.pop()}}),has:lt(function(e){return function(t){return at(e,t).length>0}}),contains:lt(function(e){return function(t){return(t.textContent||t.innerText||a(t)).indexOf(e)>-1}}),lang:lt(function(e){return G.test(e||"")||at.error("unsupported lang: "+e),e=e.replace(rt,it).toLowerCase(),function(t){var n;do if(n=h?t.lang:t.getAttribute("xml:lang")||t.getAttribute("lang"))return n=n.toLowerCase(),n===e||0===n.indexOf(e+"-");while((t=t.parentNode)&&1===t.nodeType);return!1}}),target:function(t){var n=e.location&&e.location.hash;return n&&n.slice(1)===t.id},root:function(e){return e===d},focus:function(e){return e===f.activeElement&&(!f.hasFocus||f.hasFocus())&&!!(e.type||e.href||~e.tabIndex)},enabled:function(e){return e.disabled===!1},disabled:function(e){return e.disabled===!0},checked:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&!!e.checked||"option"===t&&!!e.selected},selected:function(e){return e.parentNode&&e.parentNode.selectedIndex,e.selected===!0},empty:function(e){for(e=e.firstChild;e;e=e.nextSibling)if(e.nodeName>"@"||3===e.nodeType||4===e.nodeType)return!1;return!0},parent:function(e){return!o.pseudos.empty(e)},header:function(e){return tt.test(e.nodeName)},input:function(e){return et.test(e.nodeName)},button:function(e){var t=e.nodeName.toLowerCase();return"input"===t&&"button"===e.type||"button"===t},text:function(e){var t;return"input"===e.nodeName.toLowerCase()&&"text"===e.type&&(null==(t=e.getAttribute("type"))||t.toLowerCase()===e.type)},first:ht(function(){return[0]}),last:ht(function(e,t){return[t-1]}),eq:ht(function(e,t,n){return[0>n?n+t:n]}),even:ht(function(e,t){var n=0;for(;t>n;n+=2)e.push(n);return e}),odd:ht(function(e,t){var n=1;for(;t>n;n+=2)e.push(n);return e}),lt:ht(function(e,t,n){var r=0>n?n+t:n;for(;--r>=0;)e.push(r);return e}),gt:ht(function(e,t,n){var r=0>n?n+t:n;for(;t>++r;)e.push(r);return e})}},o.pseudos.nth=o.pseudos.eq;for(n in{radio:!0,checkbox:!0,file:!0,password:!0,image:!0})o.pseudos[n]=ft(n);for(n in{submit:!0,reset:!0})o.pseudos[n]=dt(n);function gt(){}gt.prototype=o.filters=o.pseudos,o.setFilters=new gt;function mt(e,t){var n,r,i,a,s,l,u,c=k[e+" "];if(c)return t?0:c.slice(0);s=e,l=[],u=o.preFilter;while(s){(!n||(r=X.exec(s)))&&(r&&(s=s.slice(r[0].length)||s),l.push(i=[])),n=!1,(r=U.exec(s))&&(n=r.shift(),i.push({value:n,type:r[0].replace(z," ")}),s=s.slice(n.length));for(a in o.filter)!(r=Q[a].exec(s))||u[a]&&!(r=u[a](r))||(n=r.shift(),i.push({value:n,type:a,matches:r}),s=s.slice(n.length));if(!n)break}return t?s.length:s?at.error(e):k(e,l).slice(0)}function yt(e){var t=0,n=e.length,r="";for(;n>t;t++)r+=e[t].value;return r}function vt(e,t,n){var r=t.dir,o=n&&"parentNode"===r,a=C++;return t.first?function(t,n,i){while(t=t[r])if(1===t.nodeType||o)return e(t,n,i)}:function(t,n,s){var l,u,c,p=T+" "+a;if(s){while(t=t[r])if((1===t.nodeType||o)&&e(t,n,s))return!0}else while(t=t[r])if(1===t.nodeType||o)if(c=t[b]||(t[b]={}),(u=c[r])&&u[0]===p){if((l=u[1])===!0||l===i)return l===!0}else if(u=c[r]=[p],u[1]=e(t,n,s)||i,u[1]===!0)return!0}}function bt(e){return e.length>1?function(t,n,r){var i=e.length;while(i--)if(!e[i](t,n,r))return!1;return!0}:e[0]}function xt(e,t,n,r,i){var o,a=[],s=0,l=e.length,u=null!=t;for(;l>s;s++)(o=e[s])&&(!n||n(o,r,i))&&(a.push(o),u&&t.push(s));return a}function wt(e,t,n,r,i,o){return r&&!r[b]&&(r=wt(r)),i&&!i[b]&&(i=wt(i,o)),lt(function(o,a,s,l){var u,c,p,f=[],d=[],h=a.length,g=o||Nt(t||"*",s.nodeType?[s]:s,[]),m=!e||!o&&t?g:xt(g,f,e,s,l),y=n?i||(o?e:h||r)?[]:a:m;if(n&&n(m,y,s,l),r){u=xt(y,d),r(u,[],s,l),c=u.length;while(c--)(p=u[c])&&(y[d[c]]=!(m[d[c]]=p))}if(o){if(i||e){if(i){u=[],c=y.length;while(c--)(p=y[c])&&u.push(m[c]=p);i(null,y=[],u,l)}c=y.length;while(c--)(p=y[c])&&(u=i?F.call(o,p):f[c])>-1&&(o[u]=!(a[u]=p))}}else y=xt(y===a?y.splice(h,y.length):y),i?i(null,a,y,l):M.apply(a,y)})}function Tt(e){var t,n,r,i=e.length,a=o.relative[e[0].type],s=a||o.relative[" "],l=a?1:0,c=vt(function(e){return e===t},s,!0),p=vt(function(e){return F.call(t,e)>-1},s,!0),f=[function(e,n,r){return!a&&(r||n!==u)||((t=n).nodeType?c(e,n,r):p(e,n,r))}];for(;i>l;l++)if(n=o.relative[e[l].type])f=[vt(bt(f),n)];else{if(n=o.filter[e[l].type].apply(null,e[l].matches),n[b]){for(r=++l;i>r;r++)if(o.relative[e[r].type])break;return wt(l>1&&bt(f),l>1&&yt(e.slice(0,l-1).concat({value:" "===e[l-2].type?"*":""})).replace(z,"$1"),n,r>l&&Tt(e.slice(l,r)),i>r&&Tt(e=e.slice(r)),i>r&&yt(e))}f.push(n)}return bt(f)}function Ct(e,t){var n=0,r=t.length>0,a=e.length>0,s=function(s,l,c,p,d){var h,g,m,y=[],v=0,b="0",x=s&&[],w=null!=d,C=u,N=s||a&&o.find.TAG("*",d&&l.parentNode||l),k=T+=null==C?1:Math.random()||.1;for(w&&(u=l!==f&&l,i=n);null!=(h=N[b]);b++){if(a&&h){g=0;while(m=e[g++])if(m(h,l,c)){p.push(h);break}w&&(T=k,i=++n)}r&&((h=!m&&h)&&v--,s&&x.push(h))}if(v+=b,r&&b!==v){g=0;while(m=t[g++])m(x,y,l,c);if(s){if(v>0)while(b--)x[b]||y[b]||(y[b]=q.call(p));y=xt(y)}M.apply(p,y),w&&!s&&y.length>0&&v+t.length>1&&at.uniqueSort(p)}return w&&(T=k,u=C),x};return r?lt(s):s}l=at.compile=function(e,t){var n,r=[],i=[],o=E[e+" "];if(!o){t||(t=mt(e)),n=t.length;while(n--)o=Tt(t[n]),o[b]?r.push(o):i.push(o);o=E(e,Ct(i,r))}return o};function Nt(e,t,n){var r=0,i=t.length;for(;i>r;r++)at(e,t[r],n);return n}function kt(e,t,n,i){var a,s,u,c,p,f=mt(e);if(!i&&1===f.length){if(s=f[0]=f[0].slice(0),s.length>2&&"ID"===(u=s[0]).type&&r.getById&&9===t.nodeType&&h&&o.relative[s[1].type]){if(t=(o.find.ID(u.matches[0].replace(rt,it),t)||[])[0],!t)return n;e=e.slice(s.shift().value.length)}a=Q.needsContext.test(e)?0:s.length;while(a--){if(u=s[a],o.relative[c=u.type])break;if((p=o.find[c])&&(i=p(u.matches[0].replace(rt,it),V.test(s[0].type)&&t.parentNode||t))){if(s.splice(a,1),e=i.length&&yt(s),!e)return M.apply(n,i),n;break}}}return l(e,f)(i,t,!h,n,V.test(e)),n}r.sortStable=b.split("").sort(A).join("")===b,r.detectDuplicates=S,p(),r.sortDetached=ut(function(e){return 1&e.compareDocumentPosition(f.createElement("div"))}),ut(function(e){return e.innerHTML="<a href='#'></a>","#"===e.firstChild.getAttribute("href")})||ct("type|href|height|width",function(e,n,r){return r?t:e.getAttribute(n,"type"===n.toLowerCase()?1:2)}),r.attributes&&ut(function(e){return e.innerHTML="<input/>",e.firstChild.setAttribute("value",""),""===e.firstChild.getAttribute("value")})||ct("value",function(e,n,r){return r||"input"!==e.nodeName.toLowerCase()?t:e.defaultValue}),ut(function(e){return null==e.getAttribute("disabled")})||ct(B,function(e,n,r){var i;return r?t:(i=e.getAttributeNode(n))&&i.specified?i.value:e[n]===!0?n.toLowerCase():null}),x.find=at,x.expr=at.selectors,x.expr[":"]=x.expr.pseudos,x.unique=at.uniqueSort,x.text=at.getText,x.isXMLDoc=at.isXML,x.contains=at.contains}(e);var O={};function F(e){var t=O[e]={};return x.each(e.match(T)||[],function(e,n){t[n]=!0}),t}x.Callbacks=function(e){e="string"==typeof e?O[e]||F(e):x.extend({},e);var n,r,i,o,a,s,l=[],u=!e.once&&[],c=function(t){for(r=e.memory&&t,i=!0,a=s||0,s=0,o=l.length,n=!0;l&&o>a;a++)if(l[a].apply(t[0],t[1])===!1&&e.stopOnFalse){r=!1;break}n=!1,l&&(u?u.length&&c(u.shift()):r?l=[]:p.disable())},p={add:function(){if(l){var t=l.length;(function i(t){x.each(t,function(t,n){var r=x.type(n);"function"===r?e.unique&&p.has(n)||l.push(n):n&&n.length&&"string"!==r&&i(n)})})(arguments),n?o=l.length:r&&(s=t,c(r))}return this},remove:function(){return l&&x.each(arguments,function(e,t){var r;while((r=x.inArray(t,l,r))>-1)l.splice(r,1),n&&(o>=r&&o--,a>=r&&a--)}),this},has:function(e){return e?x.inArray(e,l)>-1:!(!l||!l.length)},empty:function(){return l=[],o=0,this},disable:function(){return l=u=r=t,this},disabled:function(){return!l},lock:function(){return u=t,r||p.disable(),this},locked:function(){return!u},fireWith:function(e,t){return!l||i&&!u||(t=t||[],t=[e,t.slice?t.slice():t],n?u.push(t):c(t)),this},fire:function(){return p.fireWith(this,arguments),this},fired:function(){return!!i}};return p},x.extend({Deferred:function(e){var t=[["resolve","done",x.Callbacks("once memory"),"resolved"],["reject","fail",x.Callbacks("once memory"),"rejected"],["notify","progress",x.Callbacks("memory")]],n="pending",r={state:function(){return n},always:function(){return i.done(arguments).fail(arguments),this},then:function(){var e=arguments;return x.Deferred(function(n){x.each(t,function(t,o){var a=o[0],s=x.isFunction(e[t])&&e[t];i[o[1]](function(){var e=s&&s.apply(this,arguments);e&&x.isFunction(e.promise)?e.promise().done(n.resolve).fail(n.reject).progress(n.notify):n[a+"With"](this===r?n.promise():this,s?[e]:arguments)})}),e=null}).promise()},promise:function(e){return null!=e?x.extend(e,r):r}},i={};return r.pipe=r.then,x.each(t,function(e,o){var a=o[2],s=o[3];r[o[1]]=a.add,s&&a.add(function(){n=s},t[1^e][2].disable,t[2][2].lock),i[o[0]]=function(){return i[o[0]+"With"](this===i?r:this,arguments),this},i[o[0]+"With"]=a.fireWith}),r.promise(i),e&&e.call(i,i),i},when:function(e){var t=0,n=g.call(arguments),r=n.length,i=1!==r||e&&x.isFunction(e.promise)?r:0,o=1===i?e:x.Deferred(),a=function(e,t,n){return function(r){t[e]=this,n[e]=arguments.length>1?g.call(arguments):r,n===s?o.notifyWith(t,n):--i||o.resolveWith(t,n)}},s,l,u;if(r>1)for(s=Array(r),l=Array(r),u=Array(r);r>t;t++)n[t]&&x.isFunction(n[t].promise)?n[t].promise().done(a(t,u,n)).fail(o.reject).progress(a(t,l,s)):--i;return i||o.resolveWith(u,n),o.promise()}}),x.support=function(t){var n,r,o,s,l,u,c,p,f,d=a.createElement("div");if(d.setAttribute("className","t"),d.innerHTML="  <link/><table></table><a href='/a'>a</a><input type='checkbox'/>",n=d.getElementsByTagName("*")||[],r=d.getElementsByTagName("a")[0],!r||!r.style||!n.length)return t;s=a.createElement("select"),u=s.appendChild(a.createElement("option")),o=d.getElementsByTagName("input")[0],r.style.cssText="top:1px;float:left;opacity:.5",t.getSetAttribute="t"!==d.className,t.leadingWhitespace=3===d.firstChild.nodeType,t.tbody=!d.getElementsByTagName("tbody").length,t.htmlSerialize=!!d.getElementsByTagName("link").length,t.style=/top/.test(r.getAttribute("style")),t.hrefNormalized="/a"===r.getAttribute("href"),t.opacity=/^0.5/.test(r.style.opacity),t.cssFloat=!!r.style.cssFloat,t.checkOn=!!o.value,t.optSelected=u.selected,t.enctype=!!a.createElement("form").enctype,t.html5Clone="<:nav></:nav>"!==a.createElement("nav").cloneNode(!0).outerHTML,t.inlineBlockNeedsLayout=!1,t.shrinkWrapBlocks=!1,t.pixelPosition=!1,t.deleteExpando=!0,t.noCloneEvent=!0,t.reliableMarginRight=!0,t.boxSizingReliable=!0,o.checked=!0,t.noCloneChecked=o.cloneNode(!0).checked,s.disabled=!0,t.optDisabled=!u.disabled;try{delete d.test}catch(h){t.deleteExpando=!1}o=a.createElement("input"),o.setAttribute("value",""),t.input=""===o.getAttribute("value"),o.value="t",o.setAttribute("type","radio"),t.radioValue="t"===o.value,o.setAttribute("checked","t"),o.setAttribute("name","t"),l=a.createDocumentFragment(),l.appendChild(o),t.appendChecked=o.checked,t.checkClone=l.cloneNode(!0).cloneNode(!0).lastChild.checked,d.attachEvent&&(d.attachEvent("onclick",function(){t.noCloneEvent=!1}),d.cloneNode(!0).click());for(f in{submit:!0,change:!0,focusin:!0})d.setAttribute(c="on"+f,"t"),t[f+"Bubbles"]=c in e||d.attributes[c].expando===!1;d.style.backgroundClip="content-box",d.cloneNode(!0).style.backgroundClip="",t.clearCloneStyle="content-box"===d.style.backgroundClip;for(f in x(t))break;return t.ownLast="0"!==f,x(function(){var n,r,o,s="padding:0;margin:0;border:0;display:block;box-sizing:content-box;-moz-box-sizing:content-box;-webkit-box-sizing:content-box;",l=a.getElementsByTagName("body")[0];l&&(n=a.createElement("div"),n.style.cssText="border:0;width:0;height:0;position:absolute;top:0;left:-9999px;margin-top:1px",l.appendChild(n).appendChild(d),d.innerHTML="<table><tr><td></td><td>t</td></tr></table>",o=d.getElementsByTagName("td"),o[0].style.cssText="padding:0;margin:0;border:0;display:none",p=0===o[0].offsetHeight,o[0].style.display="",o[1].style.display="none",t.reliableHiddenOffsets=p&&0===o[0].offsetHeight,d.innerHTML="",d.style.cssText="box-sizing:border-box;-moz-box-sizing:border-box;-webkit-box-sizing:border-box;padding:1px;border:1px;display:block;width:4px;margin-top:1%;position:absolute;top:1%;",x.swap(l,null!=l.style.zoom?{zoom:1}:{},function(){t.boxSizing=4===d.offsetWidth}),e.getComputedStyle&&(t.pixelPosition="1%"!==(e.getComputedStyle(d,null)||{}).top,t.boxSizingReliable="4px"===(e.getComputedStyle(d,null)||{width:"4px"}).width,r=d.appendChild(a.createElement("div")),r.style.cssText=d.style.cssText=s,r.style.marginRight=r.style.width="0",d.style.width="1px",t.reliableMarginRight=!parseFloat((e.getComputedStyle(r,null)||{}).marginRight)),typeof d.style.zoom!==i&&(d.innerHTML="",d.style.cssText=s+"width:1px;padding:1px;display:inline;zoom:1",t.inlineBlockNeedsLayout=3===d.offsetWidth,d.style.display="block",d.innerHTML="<div></div>",d.firstChild.style.width="5px",t.shrinkWrapBlocks=3!==d.offsetWidth,t.inlineBlockNeedsLayout&&(l.style.zoom=1)),l.removeChild(n),n=d=o=r=null)}),n=s=l=u=r=o=null,t
}({});var B=/(?:\{[\s\S]*\}|\[[\s\S]*\])$/,P=/([A-Z])/g;function R(e,n,r,i){if(x.acceptData(e)){var o,a,s=x.expando,l=e.nodeType,u=l?x.cache:e,c=l?e[s]:e[s]&&s;if(c&&u[c]&&(i||u[c].data)||r!==t||"string"!=typeof n)return c||(c=l?e[s]=p.pop()||x.guid++:s),u[c]||(u[c]=l?{}:{toJSON:x.noop}),("object"==typeof n||"function"==typeof n)&&(i?u[c]=x.extend(u[c],n):u[c].data=x.extend(u[c].data,n)),a=u[c],i||(a.data||(a.data={}),a=a.data),r!==t&&(a[x.camelCase(n)]=r),"string"==typeof n?(o=a[n],null==o&&(o=a[x.camelCase(n)])):o=a,o}}function W(e,t,n){if(x.acceptData(e)){var r,i,o=e.nodeType,a=o?x.cache:e,s=o?e[x.expando]:x.expando;if(a[s]){if(t&&(r=n?a[s]:a[s].data)){x.isArray(t)?t=t.concat(x.map(t,x.camelCase)):t in r?t=[t]:(t=x.camelCase(t),t=t in r?[t]:t.split(" ")),i=t.length;while(i--)delete r[t[i]];if(n?!I(r):!x.isEmptyObject(r))return}(n||(delete a[s].data,I(a[s])))&&(o?x.cleanData([e],!0):x.support.deleteExpando||a!=a.window?delete a[s]:a[s]=null)}}}x.extend({cache:{},noData:{applet:!0,embed:!0,object:"clsid:D27CDB6E-AE6D-11cf-96B8-444553540000"},hasData:function(e){return e=e.nodeType?x.cache[e[x.expando]]:e[x.expando],!!e&&!I(e)},data:function(e,t,n){return R(e,t,n)},removeData:function(e,t){return W(e,t)},_data:function(e,t,n){return R(e,t,n,!0)},_removeData:function(e,t){return W(e,t,!0)},acceptData:function(e){if(e.nodeType&&1!==e.nodeType&&9!==e.nodeType)return!1;var t=e.nodeName&&x.noData[e.nodeName.toLowerCase()];return!t||t!==!0&&e.getAttribute("classid")===t}}),x.fn.extend({data:function(e,n){var r,i,o=null,a=0,s=this[0];if(e===t){if(this.length&&(o=x.data(s),1===s.nodeType&&!x._data(s,"parsedAttrs"))){for(r=s.attributes;r.length>a;a++)i=r[a].name,0===i.indexOf("data-")&&(i=x.camelCase(i.slice(5)),$(s,i,o[i]));x._data(s,"parsedAttrs",!0)}return o}return"object"==typeof e?this.each(function(){x.data(this,e)}):arguments.length>1?this.each(function(){x.data(this,e,n)}):s?$(s,e,x.data(s,e)):null},removeData:function(e){return this.each(function(){x.removeData(this,e)})}});function $(e,n,r){if(r===t&&1===e.nodeType){var i="data-"+n.replace(P,"-$1").toLowerCase();if(r=e.getAttribute(i),"string"==typeof r){try{r="true"===r?!0:"false"===r?!1:"null"===r?null:+r+""===r?+r:B.test(r)?x.parseJSON(r):r}catch(o){}x.data(e,n,r)}else r=t}return r}function I(e){var t;for(t in e)if(("data"!==t||!x.isEmptyObject(e[t]))&&"toJSON"!==t)return!1;return!0}x.extend({queue:function(e,n,r){var i;return e?(n=(n||"fx")+"queue",i=x._data(e,n),r&&(!i||x.isArray(r)?i=x._data(e,n,x.makeArray(r)):i.push(r)),i||[]):t},dequeue:function(e,t){t=t||"fx";var n=x.queue(e,t),r=n.length,i=n.shift(),o=x._queueHooks(e,t),a=function(){x.dequeue(e,t)};"inprogress"===i&&(i=n.shift(),r--),i&&("fx"===t&&n.unshift("inprogress"),delete o.stop,i.call(e,a,o)),!r&&o&&o.empty.fire()},_queueHooks:function(e,t){var n=t+"queueHooks";return x._data(e,n)||x._data(e,n,{empty:x.Callbacks("once memory").add(function(){x._removeData(e,t+"queue"),x._removeData(e,n)})})}}),x.fn.extend({queue:function(e,n){var r=2;return"string"!=typeof e&&(n=e,e="fx",r--),r>arguments.length?x.queue(this[0],e):n===t?this:this.each(function(){var t=x.queue(this,e,n);x._queueHooks(this,e),"fx"===e&&"inprogress"!==t[0]&&x.dequeue(this,e)})},dequeue:function(e){return this.each(function(){x.dequeue(this,e)})},delay:function(e,t){return e=x.fx?x.fx.speeds[e]||e:e,t=t||"fx",this.queue(t,function(t,n){var r=setTimeout(t,e);n.stop=function(){clearTimeout(r)}})},clearQueue:function(e){return this.queue(e||"fx",[])},promise:function(e,n){var r,i=1,o=x.Deferred(),a=this,s=this.length,l=function(){--i||o.resolveWith(a,[a])};"string"!=typeof e&&(n=e,e=t),e=e||"fx";while(s--)r=x._data(a[s],e+"queueHooks"),r&&r.empty&&(i++,r.empty.add(l));return l(),o.promise(n)}});var z,X,U=/[\t\r\n\f]/g,V=/\r/g,Y=/^(?:input|select|textarea|button|object)$/i,J=/^(?:a|area)$/i,G=/^(?:checked|selected)$/i,Q=x.support.getSetAttribute,K=x.support.input;x.fn.extend({attr:function(e,t){return x.access(this,x.attr,e,t,arguments.length>1)},removeAttr:function(e){return this.each(function(){x.removeAttr(this,e)})},prop:function(e,t){return x.access(this,x.prop,e,t,arguments.length>1)},removeProp:function(e){return e=x.propFix[e]||e,this.each(function(){try{this[e]=t,delete this[e]}catch(n){}})},addClass:function(e){var t,n,r,i,o,a=0,s=this.length,l="string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).addClass(e.call(this,t,this.className))});if(l)for(t=(e||"").match(T)||[];s>a;a++)if(n=this[a],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(U," "):" ")){o=0;while(i=t[o++])0>r.indexOf(" "+i+" ")&&(r+=i+" ");n.className=x.trim(r)}return this},removeClass:function(e){var t,n,r,i,o,a=0,s=this.length,l=0===arguments.length||"string"==typeof e&&e;if(x.isFunction(e))return this.each(function(t){x(this).removeClass(e.call(this,t,this.className))});if(l)for(t=(e||"").match(T)||[];s>a;a++)if(n=this[a],r=1===n.nodeType&&(n.className?(" "+n.className+" ").replace(U," "):"")){o=0;while(i=t[o++])while(r.indexOf(" "+i+" ")>=0)r=r.replace(" "+i+" "," ");n.className=e?x.trim(r):""}return this},toggleClass:function(e,t){var n=typeof e;return"boolean"==typeof t&&"string"===n?t?this.addClass(e):this.removeClass(e):x.isFunction(e)?this.each(function(n){x(this).toggleClass(e.call(this,n,this.className,t),t)}):this.each(function(){if("string"===n){var t,r=0,o=x(this),a=e.match(T)||[];while(t=a[r++])o.hasClass(t)?o.removeClass(t):o.addClass(t)}else(n===i||"boolean"===n)&&(this.className&&x._data(this,"__className__",this.className),this.className=this.className||e===!1?"":x._data(this,"__className__")||"")})},hasClass:function(e){var t=" "+e+" ",n=0,r=this.length;for(;r>n;n++)if(1===this[n].nodeType&&(" "+this[n].className+" ").replace(U," ").indexOf(t)>=0)return!0;return!1},val:function(e){var n,r,i,o=this[0];{if(arguments.length)return i=x.isFunction(e),this.each(function(n){var o;1===this.nodeType&&(o=i?e.call(this,n,x(this).val()):e,null==o?o="":"number"==typeof o?o+="":x.isArray(o)&&(o=x.map(o,function(e){return null==e?"":e+""})),r=x.valHooks[this.type]||x.valHooks[this.nodeName.toLowerCase()],r&&"set"in r&&r.set(this,o,"value")!==t||(this.value=o))});if(o)return r=x.valHooks[o.type]||x.valHooks[o.nodeName.toLowerCase()],r&&"get"in r&&(n=r.get(o,"value"))!==t?n:(n=o.value,"string"==typeof n?n.replace(V,""):null==n?"":n)}}}),x.extend({valHooks:{option:{get:function(e){var t=x.find.attr(e,"value");return null!=t?t:e.text}},select:{get:function(e){var t,n,r=e.options,i=e.selectedIndex,o="select-one"===e.type||0>i,a=o?null:[],s=o?i+1:r.length,l=0>i?s:o?i:0;for(;s>l;l++)if(n=r[l],!(!n.selected&&l!==i||(x.support.optDisabled?n.disabled:null!==n.getAttribute("disabled"))||n.parentNode.disabled&&x.nodeName(n.parentNode,"optgroup"))){if(t=x(n).val(),o)return t;a.push(t)}return a},set:function(e,t){var n,r,i=e.options,o=x.makeArray(t),a=i.length;while(a--)r=i[a],(r.selected=x.inArray(x(r).val(),o)>=0)&&(n=!0);return n||(e.selectedIndex=-1),o}}},attr:function(e,n,r){var o,a,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return typeof e.getAttribute===i?x.prop(e,n,r):(1===s&&x.isXMLDoc(e)||(n=n.toLowerCase(),o=x.attrHooks[n]||(x.expr.match.bool.test(n)?X:z)),r===t?o&&"get"in o&&null!==(a=o.get(e,n))?a:(a=x.find.attr(e,n),null==a?t:a):null!==r?o&&"set"in o&&(a=o.set(e,r,n))!==t?a:(e.setAttribute(n,r+""),r):(x.removeAttr(e,n),t))},removeAttr:function(e,t){var n,r,i=0,o=t&&t.match(T);if(o&&1===e.nodeType)while(n=o[i++])r=x.propFix[n]||n,x.expr.match.bool.test(n)?K&&Q||!G.test(n)?e[r]=!1:e[x.camelCase("default-"+n)]=e[r]=!1:x.attr(e,n,""),e.removeAttribute(Q?n:r)},attrHooks:{type:{set:function(e,t){if(!x.support.radioValue&&"radio"===t&&x.nodeName(e,"input")){var n=e.value;return e.setAttribute("type",t),n&&(e.value=n),t}}}},propFix:{"for":"htmlFor","class":"className"},prop:function(e,n,r){var i,o,a,s=e.nodeType;if(e&&3!==s&&8!==s&&2!==s)return a=1!==s||!x.isXMLDoc(e),a&&(n=x.propFix[n]||n,o=x.propHooks[n]),r!==t?o&&"set"in o&&(i=o.set(e,r,n))!==t?i:e[n]=r:o&&"get"in o&&null!==(i=o.get(e,n))?i:e[n]},propHooks:{tabIndex:{get:function(e){var t=x.find.attr(e,"tabindex");return t?parseInt(t,10):Y.test(e.nodeName)||J.test(e.nodeName)&&e.href?0:-1}}}}),X={set:function(e,t,n){return t===!1?x.removeAttr(e,n):K&&Q||!G.test(n)?e.setAttribute(!Q&&x.propFix[n]||n,n):e[x.camelCase("default-"+n)]=e[n]=!0,n}},x.each(x.expr.match.bool.source.match(/\w+/g),function(e,n){var r=x.expr.attrHandle[n]||x.find.attr;x.expr.attrHandle[n]=K&&Q||!G.test(n)?function(e,n,i){var o=x.expr.attrHandle[n],a=i?t:(x.expr.attrHandle[n]=t)!=r(e,n,i)?n.toLowerCase():null;return x.expr.attrHandle[n]=o,a}:function(e,n,r){return r?t:e[x.camelCase("default-"+n)]?n.toLowerCase():null}}),K&&Q||(x.attrHooks.value={set:function(e,n,r){return x.nodeName(e,"input")?(e.defaultValue=n,t):z&&z.set(e,n,r)}}),Q||(z={set:function(e,n,r){var i=e.getAttributeNode(r);return i||e.setAttributeNode(i=e.ownerDocument.createAttribute(r)),i.value=n+="","value"===r||n===e.getAttribute(r)?n:t}},x.expr.attrHandle.id=x.expr.attrHandle.name=x.expr.attrHandle.coords=function(e,n,r){var i;return r?t:(i=e.getAttributeNode(n))&&""!==i.value?i.value:null},x.valHooks.button={get:function(e,n){var r=e.getAttributeNode(n);return r&&r.specified?r.value:t},set:z.set},x.attrHooks.contenteditable={set:function(e,t,n){z.set(e,""===t?!1:t,n)}},x.each(["width","height"],function(e,n){x.attrHooks[n]={set:function(e,r){return""===r?(e.setAttribute(n,"auto"),r):t}}})),x.support.hrefNormalized||x.each(["href","src"],function(e,t){x.propHooks[t]={get:function(e){return e.getAttribute(t,4)}}}),x.support.style||(x.attrHooks.style={get:function(e){return e.style.cssText||t},set:function(e,t){return e.style.cssText=t+""}}),x.support.optSelected||(x.propHooks.selected={get:function(e){var t=e.parentNode;return t&&(t.selectedIndex,t.parentNode&&t.parentNode.selectedIndex),null}}),x.each(["tabIndex","readOnly","maxLength","cellSpacing","cellPadding","rowSpan","colSpan","useMap","frameBorder","contentEditable"],function(){x.propFix[this.toLowerCase()]=this}),x.support.enctype||(x.propFix.enctype="encoding"),x.each(["radio","checkbox"],function(){x.valHooks[this]={set:function(e,n){return x.isArray(n)?e.checked=x.inArray(x(e).val(),n)>=0:t}},x.support.checkOn||(x.valHooks[this].get=function(e){return null===e.getAttribute("value")?"on":e.value})});var Z=/^(?:input|select|textarea)$/i,et=/^key/,tt=/^(?:mouse|contextmenu)|click/,nt=/^(?:focusinfocus|focusoutblur)$/,rt=/^([^.]*)(?:\.(.+)|)$/;function it(){return!0}function ot(){return!1}function at(){try{return a.activeElement}catch(e){}}x.event={global:{},add:function(e,n,r,o,a){var s,l,u,c,p,f,d,h,g,m,y,v=x._data(e);if(v){r.handler&&(c=r,r=c.handler,a=c.selector),r.guid||(r.guid=x.guid++),(l=v.events)||(l=v.events={}),(f=v.handle)||(f=v.handle=function(e){return typeof x===i||e&&x.event.triggered===e.type?t:x.event.dispatch.apply(f.elem,arguments)},f.elem=e),n=(n||"").match(T)||[""],u=n.length;while(u--)s=rt.exec(n[u])||[],g=y=s[1],m=(s[2]||"").split(".").sort(),g&&(p=x.event.special[g]||{},g=(a?p.delegateType:p.bindType)||g,p=x.event.special[g]||{},d=x.extend({type:g,origType:y,data:o,handler:r,guid:r.guid,selector:a,needsContext:a&&x.expr.match.needsContext.test(a),namespace:m.join(".")},c),(h=l[g])||(h=l[g]=[],h.delegateCount=0,p.setup&&p.setup.call(e,o,m,f)!==!1||(e.addEventListener?e.addEventListener(g,f,!1):e.attachEvent&&e.attachEvent("on"+g,f))),p.add&&(p.add.call(e,d),d.handler.guid||(d.handler.guid=r.guid)),a?h.splice(h.delegateCount++,0,d):h.push(d),x.event.global[g]=!0);e=null}},remove:function(e,t,n,r,i){var o,a,s,l,u,c,p,f,d,h,g,m=x.hasData(e)&&x._data(e);if(m&&(c=m.events)){t=(t||"").match(T)||[""],u=t.length;while(u--)if(s=rt.exec(t[u])||[],d=g=s[1],h=(s[2]||"").split(".").sort(),d){p=x.event.special[d]||{},d=(r?p.delegateType:p.bindType)||d,f=c[d]||[],s=s[2]&&RegExp("(^|\\.)"+h.join("\\.(?:.*\\.|)")+"(\\.|$)"),l=o=f.length;while(o--)a=f[o],!i&&g!==a.origType||n&&n.guid!==a.guid||s&&!s.test(a.namespace)||r&&r!==a.selector&&("**"!==r||!a.selector)||(f.splice(o,1),a.selector&&f.delegateCount--,p.remove&&p.remove.call(e,a));l&&!f.length&&(p.teardown&&p.teardown.call(e,h,m.handle)!==!1||x.removeEvent(e,d,m.handle),delete c[d])}else for(d in c)x.event.remove(e,d+t[u],n,r,!0);x.isEmptyObject(c)&&(delete m.handle,x._removeData(e,"events"))}},trigger:function(n,r,i,o){var s,l,u,c,p,f,d,h=[i||a],g=v.call(n,"type")?n.type:n,m=v.call(n,"namespace")?n.namespace.split("."):[];if(u=f=i=i||a,3!==i.nodeType&&8!==i.nodeType&&!nt.test(g+x.event.triggered)&&(g.indexOf(".")>=0&&(m=g.split("."),g=m.shift(),m.sort()),l=0>g.indexOf(":")&&"on"+g,n=n[x.expando]?n:new x.Event(g,"object"==typeof n&&n),n.isTrigger=o?2:3,n.namespace=m.join("."),n.namespace_re=n.namespace?RegExp("(^|\\.)"+m.join("\\.(?:.*\\.|)")+"(\\.|$)"):null,n.result=t,n.target||(n.target=i),r=null==r?[n]:x.makeArray(r,[n]),p=x.event.special[g]||{},o||!p.trigger||p.trigger.apply(i,r)!==!1)){if(!o&&!p.noBubble&&!x.isWindow(i)){for(c=p.delegateType||g,nt.test(c+g)||(u=u.parentNode);u;u=u.parentNode)h.push(u),f=u;f===(i.ownerDocument||a)&&h.push(f.defaultView||f.parentWindow||e)}d=0;while((u=h[d++])&&!n.isPropagationStopped())n.type=d>1?c:p.bindType||g,s=(x._data(u,"events")||{})[n.type]&&x._data(u,"handle"),s&&s.apply(u,r),s=l&&u[l],s&&x.acceptData(u)&&s.apply&&s.apply(u,r)===!1&&n.preventDefault();if(n.type=g,!o&&!n.isDefaultPrevented()&&(!p._default||p._default.apply(h.pop(),r)===!1)&&x.acceptData(i)&&l&&i[g]&&!x.isWindow(i)){f=i[l],f&&(i[l]=null),x.event.triggered=g;try{i[g]()}catch(y){}x.event.triggered=t,f&&(i[l]=f)}return n.result}},dispatch:function(e){e=x.event.fix(e);var n,r,i,o,a,s=[],l=g.call(arguments),u=(x._data(this,"events")||{})[e.type]||[],c=x.event.special[e.type]||{};if(l[0]=e,e.delegateTarget=this,!c.preDispatch||c.preDispatch.call(this,e)!==!1){s=x.event.handlers.call(this,e,u),n=0;while((o=s[n++])&&!e.isPropagationStopped()){e.currentTarget=o.elem,a=0;while((i=o.handlers[a++])&&!e.isImmediatePropagationStopped())(!e.namespace_re||e.namespace_re.test(i.namespace))&&(e.handleObj=i,e.data=i.data,r=((x.event.special[i.origType]||{}).handle||i.handler).apply(o.elem,l),r!==t&&(e.result=r)===!1&&(e.preventDefault(),e.stopPropagation()))}return c.postDispatch&&c.postDispatch.call(this,e),e.result}},handlers:function(e,n){var r,i,o,a,s=[],l=n.delegateCount,u=e.target;if(l&&u.nodeType&&(!e.button||"click"!==e.type))for(;u!=this;u=u.parentNode||this)if(1===u.nodeType&&(u.disabled!==!0||"click"!==e.type)){for(o=[],a=0;l>a;a++)i=n[a],r=i.selector+" ",o[r]===t&&(o[r]=i.needsContext?x(r,this).index(u)>=0:x.find(r,this,null,[u]).length),o[r]&&o.push(i);o.length&&s.push({elem:u,handlers:o})}return n.length>l&&s.push({elem:this,handlers:n.slice(l)}),s},fix:function(e){if(e[x.expando])return e;var t,n,r,i=e.type,o=e,s=this.fixHooks[i];s||(this.fixHooks[i]=s=tt.test(i)?this.mouseHooks:et.test(i)?this.keyHooks:{}),r=s.props?this.props.concat(s.props):this.props,e=new x.Event(o),t=r.length;while(t--)n=r[t],e[n]=o[n];return e.target||(e.target=o.srcElement||a),3===e.target.nodeType&&(e.target=e.target.parentNode),e.metaKey=!!e.metaKey,s.filter?s.filter(e,o):e},props:"altKey bubbles cancelable ctrlKey currentTarget eventPhase metaKey relatedTarget shiftKey target timeStamp view which".split(" "),fixHooks:{},keyHooks:{props:"char charCode key keyCode".split(" "),filter:function(e,t){return null==e.which&&(e.which=null!=t.charCode?t.charCode:t.keyCode),e}},mouseHooks:{props:"button buttons clientX clientY fromElement offsetX offsetY pageX pageY screenX screenY toElement".split(" "),filter:function(e,n){var r,i,o,s=n.button,l=n.fromElement;return null==e.pageX&&null!=n.clientX&&(i=e.target.ownerDocument||a,o=i.documentElement,r=i.body,e.pageX=n.clientX+(o&&o.scrollLeft||r&&r.scrollLeft||0)-(o&&o.clientLeft||r&&r.clientLeft||0),e.pageY=n.clientY+(o&&o.scrollTop||r&&r.scrollTop||0)-(o&&o.clientTop||r&&r.clientTop||0)),!e.relatedTarget&&l&&(e.relatedTarget=l===e.target?n.toElement:l),e.which||s===t||(e.which=1&s?1:2&s?3:4&s?2:0),e}},special:{load:{noBubble:!0},focus:{trigger:function(){if(this!==at()&&this.focus)try{return this.focus(),!1}catch(e){}},delegateType:"focusin"},blur:{trigger:function(){return this===at()&&this.blur?(this.blur(),!1):t},delegateType:"focusout"},click:{trigger:function(){return x.nodeName(this,"input")&&"checkbox"===this.type&&this.click?(this.click(),!1):t},_default:function(e){return x.nodeName(e.target,"a")}},beforeunload:{postDispatch:function(e){e.result!==t&&(e.originalEvent.returnValue=e.result)}}},simulate:function(e,t,n,r){var i=x.extend(new x.Event,n,{type:e,isSimulated:!0,originalEvent:{}});r?x.event.trigger(i,null,t):x.event.dispatch.call(t,i),i.isDefaultPrevented()&&n.preventDefault()}},x.removeEvent=a.removeEventListener?function(e,t,n){e.removeEventListener&&e.removeEventListener(t,n,!1)}:function(e,t,n){var r="on"+t;e.detachEvent&&(typeof e[r]===i&&(e[r]=null),e.detachEvent(r,n))},x.Event=function(e,n){return this instanceof x.Event?(e&&e.type?(this.originalEvent=e,this.type=e.type,this.isDefaultPrevented=e.defaultPrevented||e.returnValue===!1||e.getPreventDefault&&e.getPreventDefault()?it:ot):this.type=e,n&&x.extend(this,n),this.timeStamp=e&&e.timeStamp||x.now(),this[x.expando]=!0,t):new x.Event(e,n)},x.Event.prototype={isDefaultPrevented:ot,isPropagationStopped:ot,isImmediatePropagationStopped:ot,preventDefault:function(){var e=this.originalEvent;this.isDefaultPrevented=it,e&&(e.preventDefault?e.preventDefault():e.returnValue=!1)},stopPropagation:function(){var e=this.originalEvent;this.isPropagationStopped=it,e&&(e.stopPropagation&&e.stopPropagation(),e.cancelBubble=!0)},stopImmediatePropagation:function(){this.isImmediatePropagationStopped=it,this.stopPropagation()}},x.each({mouseenter:"mouseover",mouseleave:"mouseout"},function(e,t){x.event.special[e]={delegateType:t,bindType:t,handle:function(e){var n,r=this,i=e.relatedTarget,o=e.handleObj;return(!i||i!==r&&!x.contains(r,i))&&(e.type=o.origType,n=o.handler.apply(this,arguments),e.type=t),n}}}),x.support.submitBubbles||(x.event.special.submit={setup:function(){return x.nodeName(this,"form")?!1:(x.event.add(this,"click._submit keypress._submit",function(e){var n=e.target,r=x.nodeName(n,"input")||x.nodeName(n,"button")?n.form:t;r&&!x._data(r,"submitBubbles")&&(x.event.add(r,"submit._submit",function(e){e._submit_bubble=!0}),x._data(r,"submitBubbles",!0))}),t)},postDispatch:function(e){e._submit_bubble&&(delete e._submit_bubble,this.parentNode&&!e.isTrigger&&x.event.simulate("submit",this.parentNode,e,!0))},teardown:function(){return x.nodeName(this,"form")?!1:(x.event.remove(this,"._submit"),t)}}),x.support.changeBubbles||(x.event.special.change={setup:function(){return Z.test(this.nodeName)?(("checkbox"===this.type||"radio"===this.type)&&(x.event.add(this,"propertychange._change",function(e){"checked"===e.originalEvent.propertyName&&(this._just_changed=!0)}),x.event.add(this,"click._change",function(e){this._just_changed&&!e.isTrigger&&(this._just_changed=!1),x.event.simulate("change",this,e,!0)})),!1):(x.event.add(this,"beforeactivate._change",function(e){var t=e.target;Z.test(t.nodeName)&&!x._data(t,"changeBubbles")&&(x.event.add(t,"change._change",function(e){!this.parentNode||e.isSimulated||e.isTrigger||x.event.simulate("change",this.parentNode,e,!0)}),x._data(t,"changeBubbles",!0))}),t)},handle:function(e){var n=e.target;return this!==n||e.isSimulated||e.isTrigger||"radio"!==n.type&&"checkbox"!==n.type?e.handleObj.handler.apply(this,arguments):t},teardown:function(){return x.event.remove(this,"._change"),!Z.test(this.nodeName)}}),x.support.focusinBubbles||x.each({focus:"focusin",blur:"focusout"},function(e,t){var n=0,r=function(e){x.event.simulate(t,e.target,x.event.fix(e),!0)};x.event.special[t]={setup:function(){0===n++&&a.addEventListener(e,r,!0)},teardown:function(){0===--n&&a.removeEventListener(e,r,!0)}}}),x.fn.extend({on:function(e,n,r,i,o){var a,s;if("object"==typeof e){"string"!=typeof n&&(r=r||n,n=t);for(a in e)this.on(a,n,r,e[a],o);return this}if(null==r&&null==i?(i=n,r=n=t):null==i&&("string"==typeof n?(i=r,r=t):(i=r,r=n,n=t)),i===!1)i=ot;else if(!i)return this;return 1===o&&(s=i,i=function(e){return x().off(e),s.apply(this,arguments)},i.guid=s.guid||(s.guid=x.guid++)),this.each(function(){x.event.add(this,e,i,r,n)})},one:function(e,t,n,r){return this.on(e,t,n,r,1)},off:function(e,n,r){var i,o;if(e&&e.preventDefault&&e.handleObj)return i=e.handleObj,x(e.delegateTarget).off(i.namespace?i.origType+"."+i.namespace:i.origType,i.selector,i.handler),this;if("object"==typeof e){for(o in e)this.off(o,n,e[o]);return this}return(n===!1||"function"==typeof n)&&(r=n,n=t),r===!1&&(r=ot),this.each(function(){x.event.remove(this,e,r,n)})},trigger:function(e,t){return this.each(function(){x.event.trigger(e,t,this)})},triggerHandler:function(e,n){var r=this[0];return r?x.event.trigger(e,n,r,!0):t}});var st=/^.[^:#\[\.,]*$/,lt=/^(?:parents|prev(?:Until|All))/,ut=x.expr.match.needsContext,ct={children:!0,contents:!0,next:!0,prev:!0};x.fn.extend({find:function(e){var t,n=[],r=this,i=r.length;if("string"!=typeof e)return this.pushStack(x(e).filter(function(){for(t=0;i>t;t++)if(x.contains(r[t],this))return!0}));for(t=0;i>t;t++)x.find(e,r[t],n);return n=this.pushStack(i>1?x.unique(n):n),n.selector=this.selector?this.selector+" "+e:e,n},has:function(e){var t,n=x(e,this),r=n.length;return this.filter(function(){for(t=0;r>t;t++)if(x.contains(this,n[t]))return!0})},not:function(e){return this.pushStack(ft(this,e||[],!0))},filter:function(e){return this.pushStack(ft(this,e||[],!1))},is:function(e){return!!ft(this,"string"==typeof e&&ut.test(e)?x(e):e||[],!1).length},closest:function(e,t){var n,r=0,i=this.length,o=[],a=ut.test(e)||"string"!=typeof e?x(e,t||this.context):0;for(;i>r;r++)for(n=this[r];n&&n!==t;n=n.parentNode)if(11>n.nodeType&&(a?a.index(n)>-1:1===n.nodeType&&x.find.matchesSelector(n,e))){n=o.push(n);break}return this.pushStack(o.length>1?x.unique(o):o)},index:function(e){return e?"string"==typeof e?x.inArray(this[0],x(e)):x.inArray(e.jquery?e[0]:e,this):this[0]&&this[0].parentNode?this.first().prevAll().length:-1},add:function(e,t){var n="string"==typeof e?x(e,t):x.makeArray(e&&e.nodeType?[e]:e),r=x.merge(this.get(),n);return this.pushStack(x.unique(r))},addBack:function(e){return this.add(null==e?this.prevObject:this.prevObject.filter(e))}});function pt(e,t){do e=e[t];while(e&&1!==e.nodeType);return e}x.each({parent:function(e){var t=e.parentNode;return t&&11!==t.nodeType?t:null},parents:function(e){return x.dir(e,"parentNode")},parentsUntil:function(e,t,n){return x.dir(e,"parentNode",n)},next:function(e){return pt(e,"nextSibling")},prev:function(e){return pt(e,"previousSibling")},nextAll:function(e){return x.dir(e,"nextSibling")},prevAll:function(e){return x.dir(e,"previousSibling")},nextUntil:function(e,t,n){return x.dir(e,"nextSibling",n)},prevUntil:function(e,t,n){return x.dir(e,"previousSibling",n)},siblings:function(e){return x.sibling((e.parentNode||{}).firstChild,e)},children:function(e){return x.sibling(e.firstChild)},contents:function(e){return x.nodeName(e,"iframe")?e.contentDocument||e.contentWindow.document:x.merge([],e.childNodes)}},function(e,t){x.fn[e]=function(n,r){var i=x.map(this,t,n);return"Until"!==e.slice(-5)&&(r=n),r&&"string"==typeof r&&(i=x.filter(r,i)),this.length>1&&(ct[e]||(i=x.unique(i)),lt.test(e)&&(i=i.reverse())),this.pushStack(i)}}),x.extend({filter:function(e,t,n){var r=t[0];return n&&(e=":not("+e+")"),1===t.length&&1===r.nodeType?x.find.matchesSelector(r,e)?[r]:[]:x.find.matches(e,x.grep(t,function(e){return 1===e.nodeType}))},dir:function(e,n,r){var i=[],o=e[n];while(o&&9!==o.nodeType&&(r===t||1!==o.nodeType||!x(o).is(r)))1===o.nodeType&&i.push(o),o=o[n];return i},sibling:function(e,t){var n=[];for(;e;e=e.nextSibling)1===e.nodeType&&e!==t&&n.push(e);return n}});function ft(e,t,n){if(x.isFunction(t))return x.grep(e,function(e,r){return!!t.call(e,r,e)!==n});if(t.nodeType)return x.grep(e,function(e){return e===t!==n});if("string"==typeof t){if(st.test(t))return x.filter(t,e,n);t=x.filter(t,e)}return x.grep(e,function(e){return x.inArray(e,t)>=0!==n})}function dt(e){var t=ht.split("|"),n=e.createDocumentFragment();if(n.createElement)while(t.length)n.createElement(t.pop());return n}var ht="abbr|article|aside|audio|bdi|canvas|data|datalist|details|figcaption|figure|footer|header|hgroup|mark|meter|nav|output|progress|section|summary|time|video",gt=/ jQuery\d+="(?:null|\d+)"/g,mt=RegExp("<(?:"+ht+")[\\s/>]","i"),yt=/^\s+/,vt=/<(?!area|br|col|embed|hr|img|input|link|meta|param)(([\w:]+)[^>]*)\/>/gi,bt=/<([\w:]+)/,xt=/<tbody/i,wt=/<|&#?\w+;/,Tt=/<(?:script|style|link)/i,Ct=/^(?:checkbox|radio)$/i,Nt=/checked\s*(?:[^=]|=\s*.checked.)/i,kt=/^$|\/(?:java|ecma)script/i,Et=/^true\/(.*)/,St=/^\s*<!(?:\[CDATA\[|--)|(?:\]\]|--)>\s*$/g,At={option:[1,"<select multiple='multiple'>","</select>"],legend:[1,"<fieldset>","</fieldset>"],area:[1,"<map>","</map>"],param:[1,"<object>","</object>"],thead:[1,"<table>","</table>"],tr:[2,"<table><tbody>","</tbody></table>"],col:[2,"<table><tbody></tbody><colgroup>","</colgroup></table>"],td:[3,"<table><tbody><tr>","</tr></tbody></table>"],_default:x.support.htmlSerialize?[0,"",""]:[1,"X<div>","</div>"]},jt=dt(a),Dt=jt.appendChild(a.createElement("div"));At.optgroup=At.option,At.tbody=At.tfoot=At.colgroup=At.caption=At.thead,At.th=At.td,x.fn.extend({text:function(e){return x.access(this,function(e){return e===t?x.text(this):this.empty().append((this[0]&&this[0].ownerDocument||a).createTextNode(e))},null,e,arguments.length)},append:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Lt(this,e);t.appendChild(e)}})},prepend:function(){return this.domManip(arguments,function(e){if(1===this.nodeType||11===this.nodeType||9===this.nodeType){var t=Lt(this,e);t.insertBefore(e,t.firstChild)}})},before:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this)})},after:function(){return this.domManip(arguments,function(e){this.parentNode&&this.parentNode.insertBefore(e,this.nextSibling)})},remove:function(e,t){var n,r=e?x.filter(e,this):this,i=0;for(;null!=(n=r[i]);i++)t||1!==n.nodeType||x.cleanData(Ft(n)),n.parentNode&&(t&&x.contains(n.ownerDocument,n)&&_t(Ft(n,"script")),n.parentNode.removeChild(n));return this},empty:function(){var e,t=0;for(;null!=(e=this[t]);t++){1===e.nodeType&&x.cleanData(Ft(e,!1));while(e.firstChild)e.removeChild(e.firstChild);e.options&&x.nodeName(e,"select")&&(e.options.length=0)}return this},clone:function(e,t){return e=null==e?!1:e,t=null==t?e:t,this.map(function(){return x.clone(this,e,t)})},html:function(e){return x.access(this,function(e){var n=this[0]||{},r=0,i=this.length;if(e===t)return 1===n.nodeType?n.innerHTML.replace(gt,""):t;if(!("string"!=typeof e||Tt.test(e)||!x.support.htmlSerialize&&mt.test(e)||!x.support.leadingWhitespace&&yt.test(e)||At[(bt.exec(e)||["",""])[1].toLowerCase()])){e=e.replace(vt,"<$1></$2>");try{for(;i>r;r++)n=this[r]||{},1===n.nodeType&&(x.cleanData(Ft(n,!1)),n.innerHTML=e);n=0}catch(o){}}n&&this.empty().append(e)},null,e,arguments.length)},replaceWith:function(){var e=x.map(this,function(e){return[e.nextSibling,e.parentNode]}),t=0;return this.domManip(arguments,function(n){var r=e[t++],i=e[t++];i&&(r&&r.parentNode!==i&&(r=this.nextSibling),x(this).remove(),i.insertBefore(n,r))},!0),t?this:this.remove()},detach:function(e){return this.remove(e,!0)},domManip:function(e,t,n){e=d.apply([],e);var r,i,o,a,s,l,u=0,c=this.length,p=this,f=c-1,h=e[0],g=x.isFunction(h);if(g||!(1>=c||"string"!=typeof h||x.support.checkClone)&&Nt.test(h))return this.each(function(r){var i=p.eq(r);g&&(e[0]=h.call(this,r,i.html())),i.domManip(e,t,n)});if(c&&(l=x.buildFragment(e,this[0].ownerDocument,!1,!n&&this),r=l.firstChild,1===l.childNodes.length&&(l=r),r)){for(a=x.map(Ft(l,"script"),Ht),o=a.length;c>u;u++)i=l,u!==f&&(i=x.clone(i,!0,!0),o&&x.merge(a,Ft(i,"script"))),t.call(this[u],i,u);if(o)for(s=a[a.length-1].ownerDocument,x.map(a,qt),u=0;o>u;u++)i=a[u],kt.test(i.type||"")&&!x._data(i,"globalEval")&&x.contains(s,i)&&(i.src?x._evalUrl(i.src):x.globalEval((i.text||i.textContent||i.innerHTML||"").replace(St,"")));l=r=null}return this}});function Lt(e,t){return x.nodeName(e,"table")&&x.nodeName(1===t.nodeType?t:t.firstChild,"tr")?e.getElementsByTagName("tbody")[0]||e.appendChild(e.ownerDocument.createElement("tbody")):e}function Ht(e){return e.type=(null!==x.find.attr(e,"type"))+"/"+e.type,e}function qt(e){var t=Et.exec(e.type);return t?e.type=t[1]:e.removeAttribute("type"),e}function _t(e,t){var n,r=0;for(;null!=(n=e[r]);r++)x._data(n,"globalEval",!t||x._data(t[r],"globalEval"))}function Mt(e,t){if(1===t.nodeType&&x.hasData(e)){var n,r,i,o=x._data(e),a=x._data(t,o),s=o.events;if(s){delete a.handle,a.events={};for(n in s)for(r=0,i=s[n].length;i>r;r++)x.event.add(t,n,s[n][r])}a.data&&(a.data=x.extend({},a.data))}}function Ot(e,t){var n,r,i;if(1===t.nodeType){if(n=t.nodeName.toLowerCase(),!x.support.noCloneEvent&&t[x.expando]){i=x._data(t);for(r in i.events)x.removeEvent(t,r,i.handle);t.removeAttribute(x.expando)}"script"===n&&t.text!==e.text?(Ht(t).text=e.text,qt(t)):"object"===n?(t.parentNode&&(t.outerHTML=e.outerHTML),x.support.html5Clone&&e.innerHTML&&!x.trim(t.innerHTML)&&(t.innerHTML=e.innerHTML)):"input"===n&&Ct.test(e.type)?(t.defaultChecked=t.checked=e.checked,t.value!==e.value&&(t.value=e.value)):"option"===n?t.defaultSelected=t.selected=e.defaultSelected:("input"===n||"textarea"===n)&&(t.defaultValue=e.defaultValue)}}x.each({appendTo:"append",prependTo:"prepend",insertBefore:"before",insertAfter:"after",replaceAll:"replaceWith"},function(e,t){x.fn[e]=function(e){var n,r=0,i=[],o=x(e),a=o.length-1;for(;a>=r;r++)n=r===a?this:this.clone(!0),x(o[r])[t](n),h.apply(i,n.get());return this.pushStack(i)}});function Ft(e,n){var r,o,a=0,s=typeof e.getElementsByTagName!==i?e.getElementsByTagName(n||"*"):typeof e.querySelectorAll!==i?e.querySelectorAll(n||"*"):t;if(!s)for(s=[],r=e.childNodes||e;null!=(o=r[a]);a++)!n||x.nodeName(o,n)?s.push(o):x.merge(s,Ft(o,n));return n===t||n&&x.nodeName(e,n)?x.merge([e],s):s}function Bt(e){Ct.test(e.type)&&(e.defaultChecked=e.checked)}x.extend({clone:function(e,t,n){var r,i,o,a,s,l=x.contains(e.ownerDocument,e);if(x.support.html5Clone||x.isXMLDoc(e)||!mt.test("<"+e.nodeName+">")?o=e.cloneNode(!0):(Dt.innerHTML=e.outerHTML,Dt.removeChild(o=Dt.firstChild)),!(x.support.noCloneEvent&&x.support.noCloneChecked||1!==e.nodeType&&11!==e.nodeType||x.isXMLDoc(e)))for(r=Ft(o),s=Ft(e),a=0;null!=(i=s[a]);++a)r[a]&&Ot(i,r[a]);if(t)if(n)for(s=s||Ft(e),r=r||Ft(o),a=0;null!=(i=s[a]);a++)Mt(i,r[a]);else Mt(e,o);return r=Ft(o,"script"),r.length>0&&_t(r,!l&&Ft(e,"script")),r=s=i=null,o},buildFragment:function(e,t,n,r){var i,o,a,s,l,u,c,p=e.length,f=dt(t),d=[],h=0;for(;p>h;h++)if(o=e[h],o||0===o)if("object"===x.type(o))x.merge(d,o.nodeType?[o]:o);else if(wt.test(o)){s=s||f.appendChild(t.createElement("div")),l=(bt.exec(o)||["",""])[1].toLowerCase(),c=At[l]||At._default,s.innerHTML=c[1]+o.replace(vt,"<$1></$2>")+c[2],i=c[0];while(i--)s=s.lastChild;if(!x.support.leadingWhitespace&&yt.test(o)&&d.push(t.createTextNode(yt.exec(o)[0])),!x.support.tbody){o="table"!==l||xt.test(o)?"<table>"!==c[1]||xt.test(o)?0:s:s.firstChild,i=o&&o.childNodes.length;while(i--)x.nodeName(u=o.childNodes[i],"tbody")&&!u.childNodes.length&&o.removeChild(u)}x.merge(d,s.childNodes),s.textContent="";while(s.firstChild)s.removeChild(s.firstChild);s=f.lastChild}else d.push(t.createTextNode(o));s&&f.removeChild(s),x.support.appendChecked||x.grep(Ft(d,"input"),Bt),h=0;while(o=d[h++])if((!r||-1===x.inArray(o,r))&&(a=x.contains(o.ownerDocument,o),s=Ft(f.appendChild(o),"script"),a&&_t(s),n)){i=0;while(o=s[i++])kt.test(o.type||"")&&n.push(o)}return s=null,f},cleanData:function(e,t){var n,r,o,a,s=0,l=x.expando,u=x.cache,c=x.support.deleteExpando,f=x.event.special;for(;null!=(n=e[s]);s++)if((t||x.acceptData(n))&&(o=n[l],a=o&&u[o])){if(a.events)for(r in a.events)f[r]?x.event.remove(n,r):x.removeEvent(n,r,a.handle);
u[o]&&(delete u[o],c?delete n[l]:typeof n.removeAttribute!==i?n.removeAttribute(l):n[l]=null,p.push(o))}},_evalUrl:function(e){return x.ajax({url:e,type:"GET",dataType:"script",async:!1,global:!1,"throws":!0})}}),x.fn.extend({wrapAll:function(e){if(x.isFunction(e))return this.each(function(t){x(this).wrapAll(e.call(this,t))});if(this[0]){var t=x(e,this[0].ownerDocument).eq(0).clone(!0);this[0].parentNode&&t.insertBefore(this[0]),t.map(function(){var e=this;while(e.firstChild&&1===e.firstChild.nodeType)e=e.firstChild;return e}).append(this)}return this},wrapInner:function(e){return x.isFunction(e)?this.each(function(t){x(this).wrapInner(e.call(this,t))}):this.each(function(){var t=x(this),n=t.contents();n.length?n.wrapAll(e):t.append(e)})},wrap:function(e){var t=x.isFunction(e);return this.each(function(n){x(this).wrapAll(t?e.call(this,n):e)})},unwrap:function(){return this.parent().each(function(){x.nodeName(this,"body")||x(this).replaceWith(this.childNodes)}).end()}});var Pt,Rt,Wt,$t=/alpha\([^)]*\)/i,It=/opacity\s*=\s*([^)]*)/,zt=/^(top|right|bottom|left)$/,Xt=/^(none|table(?!-c[ea]).+)/,Ut=/^margin/,Vt=RegExp("^("+w+")(.*)$","i"),Yt=RegExp("^("+w+")(?!px)[a-z%]+$","i"),Jt=RegExp("^([+-])=("+w+")","i"),Gt={BODY:"block"},Qt={position:"absolute",visibility:"hidden",display:"block"},Kt={letterSpacing:0,fontWeight:400},Zt=["Top","Right","Bottom","Left"],en=["Webkit","O","Moz","ms"];function tn(e,t){if(t in e)return t;var n=t.charAt(0).toUpperCase()+t.slice(1),r=t,i=en.length;while(i--)if(t=en[i]+n,t in e)return t;return r}function nn(e,t){return e=t||e,"none"===x.css(e,"display")||!x.contains(e.ownerDocument,e)}function rn(e,t){var n,r,i,o=[],a=0,s=e.length;for(;s>a;a++)r=e[a],r.style&&(o[a]=x._data(r,"olddisplay"),n=r.style.display,t?(o[a]||"none"!==n||(r.style.display=""),""===r.style.display&&nn(r)&&(o[a]=x._data(r,"olddisplay",ln(r.nodeName)))):o[a]||(i=nn(r),(n&&"none"!==n||!i)&&x._data(r,"olddisplay",i?n:x.css(r,"display"))));for(a=0;s>a;a++)r=e[a],r.style&&(t&&"none"!==r.style.display&&""!==r.style.display||(r.style.display=t?o[a]||"":"none"));return e}x.fn.extend({css:function(e,n){return x.access(this,function(e,n,r){var i,o,a={},s=0;if(x.isArray(n)){for(o=Rt(e),i=n.length;i>s;s++)a[n[s]]=x.css(e,n[s],!1,o);return a}return r!==t?x.style(e,n,r):x.css(e,n)},e,n,arguments.length>1)},show:function(){return rn(this,!0)},hide:function(){return rn(this)},toggle:function(e){return"boolean"==typeof e?e?this.show():this.hide():this.each(function(){nn(this)?x(this).show():x(this).hide()})}}),x.extend({cssHooks:{opacity:{get:function(e,t){if(t){var n=Wt(e,"opacity");return""===n?"1":n}}}},cssNumber:{columnCount:!0,fillOpacity:!0,fontWeight:!0,lineHeight:!0,opacity:!0,order:!0,orphans:!0,widows:!0,zIndex:!0,zoom:!0},cssProps:{"float":x.support.cssFloat?"cssFloat":"styleFloat"},style:function(e,n,r,i){if(e&&3!==e.nodeType&&8!==e.nodeType&&e.style){var o,a,s,l=x.camelCase(n),u=e.style;if(n=x.cssProps[l]||(x.cssProps[l]=tn(u,l)),s=x.cssHooks[n]||x.cssHooks[l],r===t)return s&&"get"in s&&(o=s.get(e,!1,i))!==t?o:u[n];if(a=typeof r,"string"===a&&(o=Jt.exec(r))&&(r=(o[1]+1)*o[2]+parseFloat(x.css(e,n)),a="number"),!(null==r||"number"===a&&isNaN(r)||("number"!==a||x.cssNumber[l]||(r+="px"),x.support.clearCloneStyle||""!==r||0!==n.indexOf("background")||(u[n]="inherit"),s&&"set"in s&&(r=s.set(e,r,i))===t)))try{u[n]=r}catch(c){}}},css:function(e,n,r,i){var o,a,s,l=x.camelCase(n);return n=x.cssProps[l]||(x.cssProps[l]=tn(e.style,l)),s=x.cssHooks[n]||x.cssHooks[l],s&&"get"in s&&(a=s.get(e,!0,r)),a===t&&(a=Wt(e,n,i)),"normal"===a&&n in Kt&&(a=Kt[n]),""===r||r?(o=parseFloat(a),r===!0||x.isNumeric(o)?o||0:a):a}}),e.getComputedStyle?(Rt=function(t){return e.getComputedStyle(t,null)},Wt=function(e,n,r){var i,o,a,s=r||Rt(e),l=s?s.getPropertyValue(n)||s[n]:t,u=e.style;return s&&(""!==l||x.contains(e.ownerDocument,e)||(l=x.style(e,n)),Yt.test(l)&&Ut.test(n)&&(i=u.width,o=u.minWidth,a=u.maxWidth,u.minWidth=u.maxWidth=u.width=l,l=s.width,u.width=i,u.minWidth=o,u.maxWidth=a)),l}):a.documentElement.currentStyle&&(Rt=function(e){return e.currentStyle},Wt=function(e,n,r){var i,o,a,s=r||Rt(e),l=s?s[n]:t,u=e.style;return null==l&&u&&u[n]&&(l=u[n]),Yt.test(l)&&!zt.test(n)&&(i=u.left,o=e.runtimeStyle,a=o&&o.left,a&&(o.left=e.currentStyle.left),u.left="fontSize"===n?"1em":l,l=u.pixelLeft+"px",u.left=i,a&&(o.left=a)),""===l?"auto":l});function on(e,t,n){var r=Vt.exec(t);return r?Math.max(0,r[1]-(n||0))+(r[2]||"px"):t}function an(e,t,n,r,i){var o=n===(r?"border":"content")?4:"width"===t?1:0,a=0;for(;4>o;o+=2)"margin"===n&&(a+=x.css(e,n+Zt[o],!0,i)),r?("content"===n&&(a-=x.css(e,"padding"+Zt[o],!0,i)),"margin"!==n&&(a-=x.css(e,"border"+Zt[o]+"Width",!0,i))):(a+=x.css(e,"padding"+Zt[o],!0,i),"padding"!==n&&(a+=x.css(e,"border"+Zt[o]+"Width",!0,i)));return a}function sn(e,t,n){var r=!0,i="width"===t?e.offsetWidth:e.offsetHeight,o=Rt(e),a=x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,o);if(0>=i||null==i){if(i=Wt(e,t,o),(0>i||null==i)&&(i=e.style[t]),Yt.test(i))return i;r=a&&(x.support.boxSizingReliable||i===e.style[t]),i=parseFloat(i)||0}return i+an(e,t,n||(a?"border":"content"),r,o)+"px"}function ln(e){var t=a,n=Gt[e];return n||(n=un(e,t),"none"!==n&&n||(Pt=(Pt||x("<iframe frameborder='0' width='0' height='0'/>").css("cssText","display:block !important")).appendTo(t.documentElement),t=(Pt[0].contentWindow||Pt[0].contentDocument).document,t.write("<!doctype html><html><body>"),t.close(),n=un(e,t),Pt.detach()),Gt[e]=n),n}function un(e,t){var n=x(t.createElement(e)).appendTo(t.body),r=x.css(n[0],"display");return n.remove(),r}x.each(["height","width"],function(e,n){x.cssHooks[n]={get:function(e,r,i){return r?0===e.offsetWidth&&Xt.test(x.css(e,"display"))?x.swap(e,Qt,function(){return sn(e,n,i)}):sn(e,n,i):t},set:function(e,t,r){var i=r&&Rt(e);return on(e,t,r?an(e,n,r,x.support.boxSizing&&"border-box"===x.css(e,"boxSizing",!1,i),i):0)}}}),x.support.opacity||(x.cssHooks.opacity={get:function(e,t){return It.test((t&&e.currentStyle?e.currentStyle.filter:e.style.filter)||"")?.01*parseFloat(RegExp.$1)+"":t?"1":""},set:function(e,t){var n=e.style,r=e.currentStyle,i=x.isNumeric(t)?"alpha(opacity="+100*t+")":"",o=r&&r.filter||n.filter||"";n.zoom=1,(t>=1||""===t)&&""===x.trim(o.replace($t,""))&&n.removeAttribute&&(n.removeAttribute("filter"),""===t||r&&!r.filter)||(n.filter=$t.test(o)?o.replace($t,i):o+" "+i)}}),x(function(){x.support.reliableMarginRight||(x.cssHooks.marginRight={get:function(e,n){return n?x.swap(e,{display:"inline-block"},Wt,[e,"marginRight"]):t}}),!x.support.pixelPosition&&x.fn.position&&x.each(["top","left"],function(e,n){x.cssHooks[n]={get:function(e,r){return r?(r=Wt(e,n),Yt.test(r)?x(e).position()[n]+"px":r):t}}})}),x.expr&&x.expr.filters&&(x.expr.filters.hidden=function(e){return 0>=e.offsetWidth&&0>=e.offsetHeight||!x.support.reliableHiddenOffsets&&"none"===(e.style&&e.style.display||x.css(e,"display"))},x.expr.filters.visible=function(e){return!x.expr.filters.hidden(e)}),x.each({margin:"",padding:"",border:"Width"},function(e,t){x.cssHooks[e+t]={expand:function(n){var r=0,i={},o="string"==typeof n?n.split(" "):[n];for(;4>r;r++)i[e+Zt[r]+t]=o[r]||o[r-2]||o[0];return i}},Ut.test(e)||(x.cssHooks[e+t].set=on)});var cn=/%20/g,pn=/\[\]$/,fn=/\r?\n/g,dn=/^(?:submit|button|image|reset|file)$/i,hn=/^(?:input|select|textarea|keygen)/i;x.fn.extend({serialize:function(){return x.param(this.serializeArray())},serializeArray:function(){return this.map(function(){var e=x.prop(this,"elements");return e?x.makeArray(e):this}).filter(function(){var e=this.type;return this.name&&!x(this).is(":disabled")&&hn.test(this.nodeName)&&!dn.test(e)&&(this.checked||!Ct.test(e))}).map(function(e,t){var n=x(this).val();return null==n?null:x.isArray(n)?x.map(n,function(e){return{name:t.name,value:e.replace(fn,"\r\n")}}):{name:t.name,value:n.replace(fn,"\r\n")}}).get()}}),x.param=function(e,n){var r,i=[],o=function(e,t){t=x.isFunction(t)?t():null==t?"":t,i[i.length]=encodeURIComponent(e)+"="+encodeURIComponent(t)};if(n===t&&(n=x.ajaxSettings&&x.ajaxSettings.traditional),x.isArray(e)||e.jquery&&!x.isPlainObject(e))x.each(e,function(){o(this.name,this.value)});else for(r in e)gn(r,e[r],n,o);return i.join("&").replace(cn,"+")};function gn(e,t,n,r){var i;if(x.isArray(t))x.each(t,function(t,i){n||pn.test(e)?r(e,i):gn(e+"["+("object"==typeof i?t:"")+"]",i,n,r)});else if(n||"object"!==x.type(t))r(e,t);else for(i in t)gn(e+"["+i+"]",t[i],n,r)}x.each("blur focus focusin focusout load resize scroll unload click dblclick mousedown mouseup mousemove mouseover mouseout mouseenter mouseleave change select submit keydown keypress keyup error contextmenu".split(" "),function(e,t){x.fn[t]=function(e,n){return arguments.length>0?this.on(t,null,e,n):this.trigger(t)}}),x.fn.extend({hover:function(e,t){return this.mouseenter(e).mouseleave(t||e)},bind:function(e,t,n){return this.on(e,null,t,n)},unbind:function(e,t){return this.off(e,null,t)},delegate:function(e,t,n,r){return this.on(t,e,n,r)},undelegate:function(e,t,n){return 1===arguments.length?this.off(e,"**"):this.off(t,e||"**",n)}});var mn,yn,vn=x.now(),bn=/\?/,xn=/#.*$/,wn=/([?&])_=[^&]*/,Tn=/^(.*?):[ \t]*([^\r\n]*)\r?$/gm,Cn=/^(?:about|app|app-storage|.+-extension|file|res|widget):$/,Nn=/^(?:GET|HEAD)$/,kn=/^\/\//,En=/^([\w.+-]+:)(?:\/\/([^\/?#:]*)(?::(\d+)|)|)/,Sn=x.fn.load,An={},jn={},Dn="*/".concat("*");try{yn=o.href}catch(Ln){yn=a.createElement("a"),yn.href="",yn=yn.href}mn=En.exec(yn.toLowerCase())||[];function Hn(e){return function(t,n){"string"!=typeof t&&(n=t,t="*");var r,i=0,o=t.toLowerCase().match(T)||[];if(x.isFunction(n))while(r=o[i++])"+"===r[0]?(r=r.slice(1)||"*",(e[r]=e[r]||[]).unshift(n)):(e[r]=e[r]||[]).push(n)}}function qn(e,n,r,i){var o={},a=e===jn;function s(l){var u;return o[l]=!0,x.each(e[l]||[],function(e,l){var c=l(n,r,i);return"string"!=typeof c||a||o[c]?a?!(u=c):t:(n.dataTypes.unshift(c),s(c),!1)}),u}return s(n.dataTypes[0])||!o["*"]&&s("*")}function _n(e,n){var r,i,o=x.ajaxSettings.flatOptions||{};for(i in n)n[i]!==t&&((o[i]?e:r||(r={}))[i]=n[i]);return r&&x.extend(!0,e,r),e}x.fn.load=function(e,n,r){if("string"!=typeof e&&Sn)return Sn.apply(this,arguments);var i,o,a,s=this,l=e.indexOf(" ");return l>=0&&(i=e.slice(l,e.length),e=e.slice(0,l)),x.isFunction(n)?(r=n,n=t):n&&"object"==typeof n&&(a="POST"),s.length>0&&x.ajax({url:e,type:a,dataType:"html",data:n}).done(function(e){o=arguments,s.html(i?x("<div>").append(x.parseHTML(e)).find(i):e)}).complete(r&&function(e,t){s.each(r,o||[e.responseText,t,e])}),this},x.each(["ajaxStart","ajaxStop","ajaxComplete","ajaxError","ajaxSuccess","ajaxSend"],function(e,t){x.fn[t]=function(e){return this.on(t,e)}}),x.extend({active:0,lastModified:{},etag:{},ajaxSettings:{url:yn,type:"GET",isLocal:Cn.test(mn[1]),global:!0,processData:!0,async:!0,contentType:"application/x-www-form-urlencoded; charset=UTF-8",accepts:{"*":Dn,text:"text/plain",html:"text/html",xml:"application/xml, text/xml",json:"application/json, text/javascript"},contents:{xml:/xml/,html:/html/,json:/json/},responseFields:{xml:"responseXML",text:"responseText",json:"responseJSON"},converters:{"* text":String,"text html":!0,"text json":x.parseJSON,"text xml":x.parseXML},flatOptions:{url:!0,context:!0}},ajaxSetup:function(e,t){return t?_n(_n(e,x.ajaxSettings),t):_n(x.ajaxSettings,e)},ajaxPrefilter:Hn(An),ajaxTransport:Hn(jn),ajax:function(e,n){"object"==typeof e&&(n=e,e=t),n=n||{};var r,i,o,a,s,l,u,c,p=x.ajaxSetup({},n),f=p.context||p,d=p.context&&(f.nodeType||f.jquery)?x(f):x.event,h=x.Deferred(),g=x.Callbacks("once memory"),m=p.statusCode||{},y={},v={},b=0,w="canceled",C={readyState:0,getResponseHeader:function(e){var t;if(2===b){if(!c){c={};while(t=Tn.exec(a))c[t[1].toLowerCase()]=t[2]}t=c[e.toLowerCase()]}return null==t?null:t},getAllResponseHeaders:function(){return 2===b?a:null},setRequestHeader:function(e,t){var n=e.toLowerCase();return b||(e=v[n]=v[n]||e,y[e]=t),this},overrideMimeType:function(e){return b||(p.mimeType=e),this},statusCode:function(e){var t;if(e)if(2>b)for(t in e)m[t]=[m[t],e[t]];else C.always(e[C.status]);return this},abort:function(e){var t=e||w;return u&&u.abort(t),k(0,t),this}};if(h.promise(C).complete=g.add,C.success=C.done,C.error=C.fail,p.url=((e||p.url||yn)+"").replace(xn,"").replace(kn,mn[1]+"//"),p.type=n.method||n.type||p.method||p.type,p.dataTypes=x.trim(p.dataType||"*").toLowerCase().match(T)||[""],null==p.crossDomain&&(r=En.exec(p.url.toLowerCase()),p.crossDomain=!(!r||r[1]===mn[1]&&r[2]===mn[2]&&(r[3]||("http:"===r[1]?"80":"443"))===(mn[3]||("http:"===mn[1]?"80":"443")))),p.data&&p.processData&&"string"!=typeof p.data&&(p.data=x.param(p.data,p.traditional)),qn(An,p,n,C),2===b)return C;l=p.global,l&&0===x.active++&&x.event.trigger("ajaxStart"),p.type=p.type.toUpperCase(),p.hasContent=!Nn.test(p.type),o=p.url,p.hasContent||(p.data&&(o=p.url+=(bn.test(o)?"&":"?")+p.data,delete p.data),p.cache===!1&&(p.url=wn.test(o)?o.replace(wn,"$1_="+vn++):o+(bn.test(o)?"&":"?")+"_="+vn++)),p.ifModified&&(x.lastModified[o]&&C.setRequestHeader("If-Modified-Since",x.lastModified[o]),x.etag[o]&&C.setRequestHeader("If-None-Match",x.etag[o])),(p.data&&p.hasContent&&p.contentType!==!1||n.contentType)&&C.setRequestHeader("Content-Type",p.contentType),C.setRequestHeader("Accept",p.dataTypes[0]&&p.accepts[p.dataTypes[0]]?p.accepts[p.dataTypes[0]]+("*"!==p.dataTypes[0]?", "+Dn+"; q=0.01":""):p.accepts["*"]);for(i in p.headers)C.setRequestHeader(i,p.headers[i]);if(p.beforeSend&&(p.beforeSend.call(f,C,p)===!1||2===b))return C.abort();w="abort";for(i in{success:1,error:1,complete:1})C[i](p[i]);if(u=qn(jn,p,n,C)){C.readyState=1,l&&d.trigger("ajaxSend",[C,p]),p.async&&p.timeout>0&&(s=setTimeout(function(){C.abort("timeout")},p.timeout));try{b=1,u.send(y,k)}catch(N){if(!(2>b))throw N;k(-1,N)}}else k(-1,"No Transport");function k(e,n,r,i){var c,y,v,w,T,N=n;2!==b&&(b=2,s&&clearTimeout(s),u=t,a=i||"",C.readyState=e>0?4:0,c=e>=200&&300>e||304===e,r&&(w=Mn(p,C,r)),w=On(p,w,C,c),c?(p.ifModified&&(T=C.getResponseHeader("Last-Modified"),T&&(x.lastModified[o]=T),T=C.getResponseHeader("etag"),T&&(x.etag[o]=T)),204===e||"HEAD"===p.type?N="nocontent":304===e?N="notmodified":(N=w.state,y=w.data,v=w.error,c=!v)):(v=N,(e||!N)&&(N="error",0>e&&(e=0))),C.status=e,C.statusText=(n||N)+"",c?h.resolveWith(f,[y,N,C]):h.rejectWith(f,[C,N,v]),C.statusCode(m),m=t,l&&d.trigger(c?"ajaxSuccess":"ajaxError",[C,p,c?y:v]),g.fireWith(f,[C,N]),l&&(d.trigger("ajaxComplete",[C,p]),--x.active||x.event.trigger("ajaxStop")))}return C},getJSON:function(e,t,n){return x.get(e,t,n,"json")},getScript:function(e,n){return x.get(e,t,n,"script")}}),x.each(["get","post"],function(e,n){x[n]=function(e,r,i,o){return x.isFunction(r)&&(o=o||i,i=r,r=t),x.ajax({url:e,type:n,dataType:o,data:r,success:i})}});function Mn(e,n,r){var i,o,a,s,l=e.contents,u=e.dataTypes;while("*"===u[0])u.shift(),o===t&&(o=e.mimeType||n.getResponseHeader("Content-Type"));if(o)for(s in l)if(l[s]&&l[s].test(o)){u.unshift(s);break}if(u[0]in r)a=u[0];else{for(s in r){if(!u[0]||e.converters[s+" "+u[0]]){a=s;break}i||(i=s)}a=a||i}return a?(a!==u[0]&&u.unshift(a),r[a]):t}function On(e,t,n,r){var i,o,a,s,l,u={},c=e.dataTypes.slice();if(c[1])for(a in e.converters)u[a.toLowerCase()]=e.converters[a];o=c.shift();while(o)if(e.responseFields[o]&&(n[e.responseFields[o]]=t),!l&&r&&e.dataFilter&&(t=e.dataFilter(t,e.dataType)),l=o,o=c.shift())if("*"===o)o=l;else if("*"!==l&&l!==o){if(a=u[l+" "+o]||u["* "+o],!a)for(i in u)if(s=i.split(" "),s[1]===o&&(a=u[l+" "+s[0]]||u["* "+s[0]])){a===!0?a=u[i]:u[i]!==!0&&(o=s[0],c.unshift(s[1]));break}if(a!==!0)if(a&&e["throws"])t=a(t);else try{t=a(t)}catch(p){return{state:"parsererror",error:a?p:"No conversion from "+l+" to "+o}}}return{state:"success",data:t}}x.ajaxSetup({accepts:{script:"text/javascript, application/javascript, application/ecmascript, application/x-ecmascript"},contents:{script:/(?:java|ecma)script/},converters:{"text script":function(e){return x.globalEval(e),e}}}),x.ajaxPrefilter("script",function(e){e.cache===t&&(e.cache=!1),e.crossDomain&&(e.type="GET",e.global=!1)}),x.ajaxTransport("script",function(e){if(e.crossDomain){var n,r=a.head||x("head")[0]||a.documentElement;return{send:function(t,i){n=a.createElement("script"),n.async=!0,e.scriptCharset&&(n.charset=e.scriptCharset),n.src=e.url,n.onload=n.onreadystatechange=function(e,t){(t||!n.readyState||/loaded|complete/.test(n.readyState))&&(n.onload=n.onreadystatechange=null,n.parentNode&&n.parentNode.removeChild(n),n=null,t||i(200,"success"))},r.insertBefore(n,r.firstChild)},abort:function(){n&&n.onload(t,!0)}}}});var Fn=[],Bn=/(=)\?(?=&|$)|\?\?/;x.ajaxSetup({jsonp:"callback",jsonpCallback:function(){var e=Fn.pop()||x.expando+"_"+vn++;return this[e]=!0,e}}),x.ajaxPrefilter("json jsonp",function(n,r,i){var o,a,s,l=n.jsonp!==!1&&(Bn.test(n.url)?"url":"string"==typeof n.data&&!(n.contentType||"").indexOf("application/x-www-form-urlencoded")&&Bn.test(n.data)&&"data");return l||"jsonp"===n.dataTypes[0]?(o=n.jsonpCallback=x.isFunction(n.jsonpCallback)?n.jsonpCallback():n.jsonpCallback,l?n[l]=n[l].replace(Bn,"$1"+o):n.jsonp!==!1&&(n.url+=(bn.test(n.url)?"&":"?")+n.jsonp+"="+o),n.converters["script json"]=function(){return s||x.error(o+" was not called"),s[0]},n.dataTypes[0]="json",a=e[o],e[o]=function(){s=arguments},i.always(function(){e[o]=a,n[o]&&(n.jsonpCallback=r.jsonpCallback,Fn.push(o)),s&&x.isFunction(a)&&a(s[0]),s=a=t}),"script"):t});var Pn,Rn,Wn=0,$n=e.ActiveXObject&&function(){var e;for(e in Pn)Pn[e](t,!0)};function In(){try{return new e.XMLHttpRequest}catch(t){}}function zn(){try{return new e.ActiveXObject("Microsoft.XMLHTTP")}catch(t){}}x.ajaxSettings.xhr=e.ActiveXObject?function(){return!this.isLocal&&In()||zn()}:In,Rn=x.ajaxSettings.xhr(),x.support.cors=!!Rn&&"withCredentials"in Rn,Rn=x.support.ajax=!!Rn,Rn&&x.ajaxTransport(function(n){if(!n.crossDomain||x.support.cors){var r;return{send:function(i,o){var a,s,l=n.xhr();if(n.username?l.open(n.type,n.url,n.async,n.username,n.password):l.open(n.type,n.url,n.async),n.xhrFields)for(s in n.xhrFields)l[s]=n.xhrFields[s];n.mimeType&&l.overrideMimeType&&l.overrideMimeType(n.mimeType),n.crossDomain||i["X-Requested-With"]||(i["X-Requested-With"]="XMLHttpRequest");try{for(s in i)l.setRequestHeader(s,i[s])}catch(u){}l.send(n.hasContent&&n.data||null),r=function(e,i){var s,u,c,p;try{if(r&&(i||4===l.readyState))if(r=t,a&&(l.onreadystatechange=x.noop,$n&&delete Pn[a]),i)4!==l.readyState&&l.abort();else{p={},s=l.status,u=l.getAllResponseHeaders(),"string"==typeof l.responseText&&(p.text=l.responseText);try{c=l.statusText}catch(f){c=""}s||!n.isLocal||n.crossDomain?1223===s&&(s=204):s=p.text?200:404}}catch(d){i||o(-1,d)}p&&o(s,c,p,u)},n.async?4===l.readyState?setTimeout(r):(a=++Wn,$n&&(Pn||(Pn={},x(e).unload($n)),Pn[a]=r),l.onreadystatechange=r):r()},abort:function(){r&&r(t,!0)}}}});var Xn,Un,Vn=/^(?:toggle|show|hide)$/,Yn=RegExp("^(?:([+-])=|)("+w+")([a-z%]*)$","i"),Jn=/queueHooks$/,Gn=[nr],Qn={"*":[function(e,t){var n=this.createTween(e,t),r=n.cur(),i=Yn.exec(t),o=i&&i[3]||(x.cssNumber[e]?"":"px"),a=(x.cssNumber[e]||"px"!==o&&+r)&&Yn.exec(x.css(n.elem,e)),s=1,l=20;if(a&&a[3]!==o){o=o||a[3],i=i||[],a=+r||1;do s=s||".5",a/=s,x.style(n.elem,e,a+o);while(s!==(s=n.cur()/r)&&1!==s&&--l)}return i&&(a=n.start=+a||+r||0,n.unit=o,n.end=i[1]?a+(i[1]+1)*i[2]:+i[2]),n}]};function Kn(){return setTimeout(function(){Xn=t}),Xn=x.now()}function Zn(e,t,n){var r,i=(Qn[t]||[]).concat(Qn["*"]),o=0,a=i.length;for(;a>o;o++)if(r=i[o].call(n,t,e))return r}function er(e,t,n){var r,i,o=0,a=Gn.length,s=x.Deferred().always(function(){delete l.elem}),l=function(){if(i)return!1;var t=Xn||Kn(),n=Math.max(0,u.startTime+u.duration-t),r=n/u.duration||0,o=1-r,a=0,l=u.tweens.length;for(;l>a;a++)u.tweens[a].run(o);return s.notifyWith(e,[u,o,n]),1>o&&l?n:(s.resolveWith(e,[u]),!1)},u=s.promise({elem:e,props:x.extend({},t),opts:x.extend(!0,{specialEasing:{}},n),originalProperties:t,originalOptions:n,startTime:Xn||Kn(),duration:n.duration,tweens:[],createTween:function(t,n){var r=x.Tween(e,u.opts,t,n,u.opts.specialEasing[t]||u.opts.easing);return u.tweens.push(r),r},stop:function(t){var n=0,r=t?u.tweens.length:0;if(i)return this;for(i=!0;r>n;n++)u.tweens[n].run(1);return t?s.resolveWith(e,[u,t]):s.rejectWith(e,[u,t]),this}}),c=u.props;for(tr(c,u.opts.specialEasing);a>o;o++)if(r=Gn[o].call(u,e,c,u.opts))return r;return x.map(c,Zn,u),x.isFunction(u.opts.start)&&u.opts.start.call(e,u),x.fx.timer(x.extend(l,{elem:e,anim:u,queue:u.opts.queue})),u.progress(u.opts.progress).done(u.opts.done,u.opts.complete).fail(u.opts.fail).always(u.opts.always)}function tr(e,t){var n,r,i,o,a;for(n in e)if(r=x.camelCase(n),i=t[r],o=e[n],x.isArray(o)&&(i=o[1],o=e[n]=o[0]),n!==r&&(e[r]=o,delete e[n]),a=x.cssHooks[r],a&&"expand"in a){o=a.expand(o),delete e[r];for(n in o)n in e||(e[n]=o[n],t[n]=i)}else t[r]=i}x.Animation=x.extend(er,{tweener:function(e,t){x.isFunction(e)?(t=e,e=["*"]):e=e.split(" ");var n,r=0,i=e.length;for(;i>r;r++)n=e[r],Qn[n]=Qn[n]||[],Qn[n].unshift(t)},prefilter:function(e,t){t?Gn.unshift(e):Gn.push(e)}});function nr(e,t,n){var r,i,o,a,s,l,u=this,c={},p=e.style,f=e.nodeType&&nn(e),d=x._data(e,"fxshow");n.queue||(s=x._queueHooks(e,"fx"),null==s.unqueued&&(s.unqueued=0,l=s.empty.fire,s.empty.fire=function(){s.unqueued||l()}),s.unqueued++,u.always(function(){u.always(function(){s.unqueued--,x.queue(e,"fx").length||s.empty.fire()})})),1===e.nodeType&&("height"in t||"width"in t)&&(n.overflow=[p.overflow,p.overflowX,p.overflowY],"inline"===x.css(e,"display")&&"none"===x.css(e,"float")&&(x.support.inlineBlockNeedsLayout&&"inline"!==ln(e.nodeName)?p.zoom=1:p.display="inline-block")),n.overflow&&(p.overflow="hidden",x.support.shrinkWrapBlocks||u.always(function(){p.overflow=n.overflow[0],p.overflowX=n.overflow[1],p.overflowY=n.overflow[2]}));for(r in t)if(i=t[r],Vn.exec(i)){if(delete t[r],o=o||"toggle"===i,i===(f?"hide":"show"))continue;c[r]=d&&d[r]||x.style(e,r)}if(!x.isEmptyObject(c)){d?"hidden"in d&&(f=d.hidden):d=x._data(e,"fxshow",{}),o&&(d.hidden=!f),f?x(e).show():u.done(function(){x(e).hide()}),u.done(function(){var t;x._removeData(e,"fxshow");for(t in c)x.style(e,t,c[t])});for(r in c)a=Zn(f?d[r]:0,r,u),r in d||(d[r]=a.start,f&&(a.end=a.start,a.start="width"===r||"height"===r?1:0))}}function rr(e,t,n,r,i){return new rr.prototype.init(e,t,n,r,i)}x.Tween=rr,rr.prototype={constructor:rr,init:function(e,t,n,r,i,o){this.elem=e,this.prop=n,this.easing=i||"swing",this.options=t,this.start=this.now=this.cur(),this.end=r,this.unit=o||(x.cssNumber[n]?"":"px")},cur:function(){var e=rr.propHooks[this.prop];return e&&e.get?e.get(this):rr.propHooks._default.get(this)},run:function(e){var t,n=rr.propHooks[this.prop];return this.pos=t=this.options.duration?x.easing[this.easing](e,this.options.duration*e,0,1,this.options.duration):e,this.now=(this.end-this.start)*t+this.start,this.options.step&&this.options.step.call(this.elem,this.now,this),n&&n.set?n.set(this):rr.propHooks._default.set(this),this}},rr.prototype.init.prototype=rr.prototype,rr.propHooks={_default:{get:function(e){var t;return null==e.elem[e.prop]||e.elem.style&&null!=e.elem.style[e.prop]?(t=x.css(e.elem,e.prop,""),t&&"auto"!==t?t:0):e.elem[e.prop]},set:function(e){x.fx.step[e.prop]?x.fx.step[e.prop](e):e.elem.style&&(null!=e.elem.style[x.cssProps[e.prop]]||x.cssHooks[e.prop])?x.style(e.elem,e.prop,e.now+e.unit):e.elem[e.prop]=e.now}}},rr.propHooks.scrollTop=rr.propHooks.scrollLeft={set:function(e){e.elem.nodeType&&e.elem.parentNode&&(e.elem[e.prop]=e.now)}},x.each(["toggle","show","hide"],function(e,t){var n=x.fn[t];x.fn[t]=function(e,r,i){return null==e||"boolean"==typeof e?n.apply(this,arguments):this.animate(ir(t,!0),e,r,i)}}),x.fn.extend({fadeTo:function(e,t,n,r){return this.filter(nn).css("opacity",0).show().end().animate({opacity:t},e,n,r)},animate:function(e,t,n,r){var i=x.isEmptyObject(e),o=x.speed(t,n,r),a=function(){var t=er(this,x.extend({},e),o);(i||x._data(this,"finish"))&&t.stop(!0)};return a.finish=a,i||o.queue===!1?this.each(a):this.queue(o.queue,a)},stop:function(e,n,r){var i=function(e){var t=e.stop;delete e.stop,t(r)};return"string"!=typeof e&&(r=n,n=e,e=t),n&&e!==!1&&this.queue(e||"fx",[]),this.each(function(){var t=!0,n=null!=e&&e+"queueHooks",o=x.timers,a=x._data(this);if(n)a[n]&&a[n].stop&&i(a[n]);else for(n in a)a[n]&&a[n].stop&&Jn.test(n)&&i(a[n]);for(n=o.length;n--;)o[n].elem!==this||null!=e&&o[n].queue!==e||(o[n].anim.stop(r),t=!1,o.splice(n,1));(t||!r)&&x.dequeue(this,e)})},finish:function(e){return e!==!1&&(e=e||"fx"),this.each(function(){var t,n=x._data(this),r=n[e+"queue"],i=n[e+"queueHooks"],o=x.timers,a=r?r.length:0;for(n.finish=!0,x.queue(this,e,[]),i&&i.stop&&i.stop.call(this,!0),t=o.length;t--;)o[t].elem===this&&o[t].queue===e&&(o[t].anim.stop(!0),o.splice(t,1));for(t=0;a>t;t++)r[t]&&r[t].finish&&r[t].finish.call(this);delete n.finish})}});function ir(e,t){var n,r={height:e},i=0;for(t=t?1:0;4>i;i+=2-t)n=Zt[i],r["margin"+n]=r["padding"+n]=e;return t&&(r.opacity=r.width=e),r}x.each({slideDown:ir("show"),slideUp:ir("hide"),slideToggle:ir("toggle"),fadeIn:{opacity:"show"},fadeOut:{opacity:"hide"},fadeToggle:{opacity:"toggle"}},function(e,t){x.fn[e]=function(e,n,r){return this.animate(t,e,n,r)}}),x.speed=function(e,t,n){var r=e&&"object"==typeof e?x.extend({},e):{complete:n||!n&&t||x.isFunction(e)&&e,duration:e,easing:n&&t||t&&!x.isFunction(t)&&t};return r.duration=x.fx.off?0:"number"==typeof r.duration?r.duration:r.duration in x.fx.speeds?x.fx.speeds[r.duration]:x.fx.speeds._default,(null==r.queue||r.queue===!0)&&(r.queue="fx"),r.old=r.complete,r.complete=function(){x.isFunction(r.old)&&r.old.call(this),r.queue&&x.dequeue(this,r.queue)},r},x.easing={linear:function(e){return e},swing:function(e){return.5-Math.cos(e*Math.PI)/2}},x.timers=[],x.fx=rr.prototype.init,x.fx.tick=function(){var e,n=x.timers,r=0;for(Xn=x.now();n.length>r;r++)e=n[r],e()||n[r]!==e||n.splice(r--,1);n.length||x.fx.stop(),Xn=t},x.fx.timer=function(e){e()&&x.timers.push(e)&&x.fx.start()},x.fx.interval=13,x.fx.start=function(){Un||(Un=setInterval(x.fx.tick,x.fx.interval))},x.fx.stop=function(){clearInterval(Un),Un=null},x.fx.speeds={slow:600,fast:200,_default:400},x.fx.step={},x.expr&&x.expr.filters&&(x.expr.filters.animated=function(e){return x.grep(x.timers,function(t){return e===t.elem}).length}),x.fn.offset=function(e){if(arguments.length)return e===t?this:this.each(function(t){x.offset.setOffset(this,e,t)});var n,r,o={top:0,left:0},a=this[0],s=a&&a.ownerDocument;if(s)return n=s.documentElement,x.contains(n,a)?(typeof a.getBoundingClientRect!==i&&(o=a.getBoundingClientRect()),r=or(s),{top:o.top+(r.pageYOffset||n.scrollTop)-(n.clientTop||0),left:o.left+(r.pageXOffset||n.scrollLeft)-(n.clientLeft||0)}):o},x.offset={setOffset:function(e,t,n){var r=x.css(e,"position");"static"===r&&(e.style.position="relative");var i=x(e),o=i.offset(),a=x.css(e,"top"),s=x.css(e,"left"),l=("absolute"===r||"fixed"===r)&&x.inArray("auto",[a,s])>-1,u={},c={},p,f;l?(c=i.position(),p=c.top,f=c.left):(p=parseFloat(a)||0,f=parseFloat(s)||0),x.isFunction(t)&&(t=t.call(e,n,o)),null!=t.top&&(u.top=t.top-o.top+p),null!=t.left&&(u.left=t.left-o.left+f),"using"in t?t.using.call(e,u):i.css(u)}},x.fn.extend({position:function(){if(this[0]){var e,t,n={top:0,left:0},r=this[0];return"fixed"===x.css(r,"position")?t=r.getBoundingClientRect():(e=this.offsetParent(),t=this.offset(),x.nodeName(e[0],"html")||(n=e.offset()),n.top+=x.css(e[0],"borderTopWidth",!0),n.left+=x.css(e[0],"borderLeftWidth",!0)),{top:t.top-n.top-x.css(r,"marginTop",!0),left:t.left-n.left-x.css(r,"marginLeft",!0)}}},offsetParent:function(){return this.map(function(){var e=this.offsetParent||s;while(e&&!x.nodeName(e,"html")&&"static"===x.css(e,"position"))e=e.offsetParent;return e||s})}}),x.each({scrollLeft:"pageXOffset",scrollTop:"pageYOffset"},function(e,n){var r=/Y/.test(n);x.fn[e]=function(i){return x.access(this,function(e,i,o){var a=or(e);return o===t?a?n in a?a[n]:a.document.documentElement[i]:e[i]:(a?a.scrollTo(r?x(a).scrollLeft():o,r?o:x(a).scrollTop()):e[i]=o,t)},e,i,arguments.length,null)}});function or(e){return x.isWindow(e)?e:9===e.nodeType?e.defaultView||e.parentWindow:!1}x.each({Height:"height",Width:"width"},function(e,n){x.each({padding:"inner"+e,content:n,"":"outer"+e},function(r,i){x.fn[i]=function(i,o){var a=arguments.length&&(r||"boolean"!=typeof i),s=r||(i===!0||o===!0?"margin":"border");return x.access(this,function(n,r,i){var o;return x.isWindow(n)?n.document.documentElement["client"+e]:9===n.nodeType?(o=n.documentElement,Math.max(n.body["scroll"+e],o["scroll"+e],n.body["offset"+e],o["offset"+e],o["client"+e])):i===t?x.css(n,r,s):x.style(n,r,i,s)},n,a?i:t,a,null)}})}),x.fn.size=function(){return this.length},x.fn.andSelf=x.fn.addBack,"object"==typeof module&&module&&"object"==typeof module.exports?module.exports=x:(e.jQuery=e.$=x,"function"==typeof define&&define.amd&&define("jquery",[],function(){return x}))})(window);
// Note: include this file when using prototype and jQuery on the same page. Be sure to include prototype.js
// and jquery.js before this file.
// The jQuery $ function will be remapped to $j as to not conflict with the prototype version of that function.

// Be aware that some jQuery plugins may use the $ function and in that case, they should be edited to use $j instead.

(function($) {
  $.noConflict();$j = $;
})(jQuery);

/*
*
* Copyright (c) 2007 Andrew Tetlaw
*
* Permission is hereby granted, free of charge, to any person
* obtaining a copy of this software and associated documentation
* files (the "Software"), to deal in the Software without
* restriction, including without limitation the rights to use, copy,
* modify, merge, publish, distribute, sublicense, and/or sell copies
* of the Software, and to permit persons to whom the Software is
* furnished to do so, subject to the following conditions:
*
* The above copyright notice and this permission notice shall be
* included in all copies or substantial portions of the Software.
*
* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
* EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
* MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
* NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS
* BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN
* ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
* CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
* SOFTWARE.
* *
*
*
* FastInit
* http://tetlaw.id.au/view/javascript/fastinit
* Andrew Tetlaw
* Version 1.4.1 (2007-03-15)
* Based on:
* http://dean.edwards.name/weblog/2006/03/faster
* http://dean.edwards.name/weblog/2006/06/again/
* Help from:
* http://www.cherny.com/webdev/26/domloaded-object-literal-updated
*
*/
var FastInit = {
  onload : function() {
    if (FastInit.done) { return; }
    FastInit.done = true;
    for(var x = 0, al = FastInit.f.length; x < al; x++) {
      FastInit.f[x]();
    }
    // check for doubleSubmit only if validateForm.js is included in the page and thus nameSpace 'doubleSubmit' is defined
    if(typeof window.doubleSubmit !== "undefined")
    {
      for ( i = 0; i < window.document.forms.length; i++ )
      {
        // In case we end up running fastinit multiple times on a page (i.e. loading a lightbox with a form onto a page with a form), make sure
        // we don't double-check the double-submit.
        if (typeof window.document.forms[i].originalFormSubmit === 'undefined')
        {
          // Below is necessary to make use of both form.onsubmit validations on individual pages
          // and form submit event handlers registered through Event.observe(..."submit"...)
          var originalFormOnSubmit = null;
          if(window.document.forms[i].onsubmit)
          {
            originalFormOnSubmit = window.document.forms[i].onsubmit;
            window.document.forms[i].onsubmit = function() {
              return;
            };
          }
          // Form.submit() doesn't call form submit event handlers registered below, so we have to make
          // sure form submit event handlers get called when form.submit() is used to submit the form
          // Note : Browser does not trigger the onsubmit event if you call the submit method of a form
          // programmatically. Likewise, we don't call form.onsubmit() here and that validation if wanted
          // is up to the developer to do before calling form.submit()
          window.document.forms[i].originalFormSubmit = window.document.forms[i].submit;
          window.document.forms[i].submit = function() {
            if(doubleSubmit.handleFormSubmitEvents( null, this, null ) == false)
            {
              return false;
            }
            return this.originalFormSubmit();
          };
          Event.observe( window.document.forms[i], "submit", doubleSubmit.handleFormSubmitEvents
              .bindAsEventListener( this, window.document.forms[i], originalFormOnSubmit ) );
        }
      }
    }
  },
  addOnLoad : function() {
    var a = arguments;
    for(var x = 0, al = a.length; x < al; x++) {
      if(typeof a[x] === 'function') {
        if (FastInit.done ) {
          a[x]();
        } else {
          FastInit.f.push(a[x]);
        }
      }
    }
  },
  listen : function() {
    if (/WebKit|khtml/i.test(navigator.userAgent)) {
      FastInit.timer = setInterval(function() {
        if (/loaded|complete/.test(document.readyState)) {
          clearInterval(FastInit.timer);
          delete FastInit.timer;
          FastInit.onload();
        }}, 10);
    } else if (document.addEventListener) {
      document.addEventListener('DOMContentLoaded', FastInit.onload, false);
    } else if(!FastInit.iew32) {
      if(window.addEventListener) {
        window.addEventListener('load', FastInit.onload, false);
      } else if (window.attachEvent) {
        return window.attachEvent('onload', FastInit.onload);
      }
    }
  },
  f:[],done:false,timer:null,iew32:false
};
/*@cc_on @*/
/*@if (@_win32)
FastInit.iew32 = true;
document.write('<script id="__ie_onload" defer src="' + ((location.protocol == 'https:') ? '//0' : 'javascript:void(0)') + '"><\/script>');
document.getElementById('__ie_onload').onreadystatechange = function(){if (this.readyState == 'complete') { FastInit.onload(); }};
/*@end @*/
FastInit.listen();
/**
 * Only include the contents of this file once - for example, if this is included in a lightbox we don't want to re-run
 * all of this - just use the loaded version.  (i.e. rerunning would clear page.bundle which would remove all the
 * language strings for the current page)
 */
if (!window.page)
{
var page = {};

page.isLoaded = false;

/**
 * Utility for adding and using localized messages on the page.
 */
page.bundle = {};
page.bundle.messages = {};
page.bundle.addKey = function( key, value )
{
  page.bundle.messages[key] = value;
};

page.bundle.getString = function( key /*, arg1, arg2, ..., argN */ )
{
  var result = page.bundle.messages[key];
  if ( !result )
  {
     return "!!!!" + key + "!!!!!";
  }
  else
  {
    if ( arguments.length > 1 )
    {
      for ( var i = 1; i < arguments.length; i++ )
      {
        result = result.replace( new RegExp("\\{"+(i-1)+"\\}","g"), arguments[i] );
      }
    }
    return result;
  }
};

/**
 * Provides support for lazy initialization of javascript behavior when a certain
 * event happens to a certain item.
 */
page.LazyInit = function( event, eventTypes, initCode )
{
  var e = event || window.event;
  var target = Event.element( event );
  // This is because events bubble and we want a reference
  // to the element we registered the handlers on.
  target = page.util.upToClass(target, "jsInit");
  for (var i = 0; i < eventTypes.length; i++ )
  {
    target['on'+eventTypes[i]] = null;
  }
  eval( initCode ); //initCode can reference "target"
};

/**
 * Evaluates any <script> tags in the provided string in the global scope.
 * Useful for evaluating scripts that come back in text from an Ajax call.
 * If signalObject is passed then signalObject.evaluatingScripts will be set to false when done.
 */
page.globalEvalScripts = function(str, evalExternalScripts, signalObject)
{
  //Get any external scripts
  var waitForVars = [];
  var scriptVars = [
                    { script: 'bb_htmlarea', variable: ['HTMLArea'] },
                    { script: 'w_editor', variable: ['WebeqEditors'] },
                    { script: 'wysiwyg.js', variable: ['vtbe_attchfiles'] },
                    { script: 'gradebook_utils.js', variable: ['gradebook_utils'] },
                    { script: 'rubric.js', variable: ['rubricModule'] },
                    { script: 'gridmgmt.js', variable: ['gridMgmt'] },
                    { script: 'calendar-time.js', variable: ['calendar'] },
                    { script: 'widget.js', variable: ['widget'] },
                    { script: 'vtbeTinymce.js', variable: ['tinyMceWrapper'] },
                    { script: 'WhatsNewView.js', variable: ['WhatsNewView'] },
                    { script: 'tiny_mce.js', variable: ['tinymce','tinyMCE'] },
                    { script: 'slider.js', variable: ['Control.Slider'] },
                    { script: 'drawer.js', variable: ['drawer'] },
                    { script: 'activeFilter.js', variable: ['activeFilter'] },
                    { script: 'inventoryList.js', variable: ['inventoryList'] },
                    { script: 'bbDialogs.js', variable: ['bb_dialogs'] }
                   ];
  if (evalExternalScripts)
  {
    var externalScriptRE = '<script[^>]*src=["\']([^>"\']*)["\'][^>]*>([\\S\\s]*?)<\/script>';
    var scriptMatches = str.match(new RegExp(externalScriptRE, 'img'));
    if (scriptMatches && scriptMatches.length > 0)
    {
      $A(scriptMatches).each(function(scriptTag)
      {
        var matches = scriptTag.match(new RegExp(externalScriptRE, 'im'));
        if (matches && matches.length > 0 && matches[1] != '')
        {
          var scriptSrc = matches[1];
          if (scriptSrc.indexOf('/dwr_open/') != -1)
          {
            // dwr_open calls will ONLY work if the current page's webapp == the caller's webapp,
            // otherwise we'll get a session error.  THis will happen if a lightbox is loaded with
            // dynamic content from a different webapp (say /webapps/blackboard) while the main page
            // is loaded from /webapps/discussionboard.  To avoid this, rewrite the url to use the
            // webapp associated with the current page.
            var newparts = scriptSrc.split('/');
            var oldparts = window.location.pathname.split('/');
            newparts[1] = oldparts[1];
            newparts[2] = oldparts[2];
            scriptSrc = newparts.join('/');
          }
          var scriptElem = new Element('script', {
            async: false,
            type: 'text/javascript',
            src: scriptSrc
          });

          // Note all jquery scripts must be loaded on the main page and they can not relied on dynamically loading
          if (!scriptSrc.match(new RegExp('jquery.*\.js', 'im')))
          {
            var head = $$('head')[0];
            head.appendChild(scriptElem);
            for ( var i = 0; i < scriptVars.length; i++ )
            {
              if ( scriptSrc.indexOf( scriptVars[i].script ) != -1 )
              {
                scriptVars[ i ].variable.each( function( s )
                {
                  waitForVars.push( s );
                } );
                break;
              }
            }
          }
        }
      });
    }
  }
//Finding Comments in HTML Source Code Using Regular Expressions and replaces with empty value
//Example: <!-- <script>alert("welcome");</script>--> = ''
//So,that extractScripts won't find commented scripts to extract
//str =str.replace(new RegExp('\<![ \r\n\t]*(--([^\-]|[\r\n]|-[^\-])*--[ \r\n\t]*)\>', 'img'), '');
  page.delayAddExtractedScripts(str.extractScripts(), waitForVars, signalObject);
};

// Evaluate any inline script - delay a bit to give the scripts above time to load
// NOTE that this is not guaranteed to work - if there are delays loading and initializing
// the scripts required then code in these scripts might fail to find the required variables
// If it is for our code then updating waitForVars appropriately per script will work
page.delayAddExtractedScripts = function (scripts, waitForVars, signalObject)
{
  var count = 0;
  if (waitForVars.length === 0)
  {
    page.actuallyAddExtractedScripts(scripts, signalObject);
  }
  else
  {
  new PeriodicalExecuter( function( pe )
  {
    if ( count < 100 )
    {
      count++;
      if ( page.allVariablesDefined(waitForVars) )
      {
        page.actuallyAddExtractedScripts(scripts, signalObject);
        pe.stop();
      }
    }
    else // give up if it takes longer than 5s to load
    {
      page.actuallyAddExtractedScripts(scripts, signalObject);
      pe.stop();
    }
  }.bind(this), 0.05 );
  }
};

page.variableDefined = function (avar)
{

  if ( !window[avar] )
  {
    if (avar.indexOf('.') > 0)
    {
      var parts = avar.split('.');
      var obj = window[parts[0]];
      for (var partNum = 1; obj && partNum < parts.length; partNum++)
      {
        obj = obj[parts[partNum]];
      }
      if (obj)
      {
        return true;
      }
    }
    return false;
  }
  return true;
};
page.allVariablesDefined = function(vars)
{
  var result = true;
  for ( var i = 0; i < vars.length; i++ )
  {
    if ( !page.variableDefined(vars[i]) )
    {
      result = false;
      break;
    }
  }
  return result;
};

page.actuallyAddExtractedScripts = function (scripts, signalObject)
{
  var scriptExecutionDelay = 0;
  if( signalObject )
  {
    scriptExecutionDelay = signalObject.delayScriptExecution;
    if (scriptExecutionDelay === undefined)
    {
      scriptExecutionDelay = 0;
    }
  }
  if (FastInit !== undefined && typeof(FastInit.onload) === "function")
  {
    FastInit.onload();
  }
  scripts.each(function(script)
    {
      if ( script != '' )
      {
        if ( Prototype.Browser.IE && window.execScript )
        {
          ( function()
            {
              window.execScript( script );
            }.delay( scriptExecutionDelay ) );
        }
        else
        {
          ( function()
            {
              var scriptElem = new Element( 'script',
              {
                type : 'text/javascript'
              } );
              var head = $$( 'head' )[ 0 ];
              script = document.createTextNode( script );
              scriptElem.appendChild( script );
              head.appendChild( scriptElem );
              head.removeChild( scriptElem );
           }.delay( scriptExecutionDelay ) );
        }
      }
    }
  );
  if (signalObject)
  {
    if ( typeof( signalObject.evaluatingScripts ) === "function" )
    {
      ( function()
      {
        signalObject.evaluatingScripts();
        signalObject.evaluatingScripts = false; //reset function so another call will not unintentionally call this callback function.
      }.defer() );
    }
    else
    {
      signalObject.evaluatingScripts = false;
    }
  }
};

//When the browser page is resized, we use page.onResizeCleanSlateIframe( widthRate ) to determine the new width for the iframe.
page.onResizeCleanSlateIframe = function( widthRatio )
{
  var iframeElement = $$('iframe.cleanSlate')[0];
  var iframeParentWidth = iframeElement.parentElement.scrollWidth;

  //We resize the iframe width according its parent element width(container width) and the ratio ( the ratio of iframe width to it's parent width).
  iframeElement.style.width = parseInt( iframeParentWidth * widthRatio) + 'px';
}

//Set iframe height and width for fitting the size of embedded content.
//This function is only called in method renderFileContentBody(...) in ContentRendererUtil.java when the iframe has been loaded.
page.setIframeHeightAndWidth = function ()
{
  try
  {
    var iframeElement = $$('iframe.cleanSlate')[0];

    // Set default height and width for the iframe so that if any un-handled situation happens in this function,
    // the iframe still can be showed properly.
    var defaultHeight = 400;
    iframeElement.style.height = defaultHeight + 'px';
    iframeElement.style.width = '100%';

    // If the current url of iframe is not file content url, we don't set the height and width.
    if ( iframeElement.contentDocument.URL.indexOf("/bbcswebdav") === -1 )
    {
      return;
    }

    // Start to handle the situation which the embedded file content contains multiple iframes/frames.
    var iframeHeight = iframeElement.contentDocument.body.scrollHeight;
    var iframeWidth = iframeElement.contentDocument.body.scrollWidth
    var containedFrames = [iframeElement.contentDocument.getElementsByTagName("frame") ,
                           iframeElement.contentDocument.getElementsByTagName("iframe")];
    var isContainsMultiFrames = ( containedFrames[0].length === 0 && containedFrames[1].length === 0 ) ? false : true;

    if ( isContainsMultiFrames === true )
    {
      var maxSizeArray =  getMaxIframeContentSize();
      iframeHeight = maxSizeArray.height;
      iframeWidth = maxSizeArray.width;
    }

    iframeElement.style.height = (iframeHeight > defaultHeight ? iframeHeight: defaultHeight) + 'px';
    iframeElement.style.width = iframeWidth + 'px';

    // As the iframe width is specified in 'px' above, causes the width would stay same when the browser page is resized,
    // so we attach 'onresize' listener here and then use page.onResizeCleanSlateIframe( widthRate ) to determine the new width for the iframe.
    var widthRatio = iframeWidth/iframeElement.parentElement.scrollWidth;  // record the ratio of iframe width to its parent element width (container width) for caculating the new width.
    Event.observe( window, 'resize', page.onResizeCleanSlateIframe( widthRatio ) );
  }
  catch(e){}

  // Go through all contained frames/Iframes for getting the max height and width.
  // TODO: Should handle iframeset in this function.
  function getMaxIframeContentSize()
  {
     var i = 0;
     var maxHeight = iframeHeight;
     var maxWidth = iframeWidth;

     try
     {
       for( i = 0; i < containedFrames.length; i++ )
       {
         var j = 0;
         for( j = 0; j < containedFrames[i].length; j++ )
         {
            var h = containedFrames[i][j].contentWindow.document.body.scrollHeight;
            var w = containedFrames[i][j].contentWindow.document.body.scrollWidth;
            maxHeight = ( maxHeight > h ) ? maxHeight : h;
            maxWidth = ( maxWidth > w ) ? maxWidth : w;
         }
       }
     }
     catch (e){}

     return {height:maxHeight , width:maxWidth};
  }
};

page.onResizeChannelIframe = function( channelExtRef )
{
  var frameId = 'iframe' + channelExtRef;
  var listId = 'list_channel' + channelExtRef;
  var f = $( frameId );
  var fli = f.contentWindow.document.getElementById( listId );
  if (fli)
  {
    f.style.height = fli.scrollHeight + 15 + "px";
  }
};

/**
 * Contains page-wide utility methods
 */
page.util = {};

/**
 * Returns whether the specific element has the specified class name.
 * Same as prototype's Element.hasClassName, except it doesn't extend the element (which is faster in IE).
 */
page.util.hasClassName = function ( element, className )
{
  var elementClassName = element.className;
  if ((typeof elementClassName == "undefined") || elementClassName.length === 0)
  {
    return false;
  }
  if (elementClassName == className ||
      elementClassName.match(new RegExp("(^|\\s)" + className + "(\\s|$)")))
  {
    return true;
  }

  return false;
};

page.util.fireClick = function ( elem )
{
  if (Prototype.Browser.IE)
  {
    elem.fireEvent("onclick");
  }
  else
  {
    var evt = document.createEvent("HTMLEvents");
    evt.initEvent("click", true, true);
    elem.dispatchEvent(evt);
  }
};

page.util.useARIA = function ()
{
  if (/Firefox[\/\s](\d+\.\d+)/.test( navigator.userAgent )) // test for Firefox/x.x or Firefox x.x (ignoring remaining digits);
  {
    var ffversion = parseFloat( RegExp.$1 ); // capture x.x portion and store as a number
    if ( ffversion >= 1.9 )
    {
      return true;
    }
  }
  else if (/MSIE (\d+\.\d+);/.test( navigator.userAgent )) // test for older MSIE x.x;
  {
    var ieversion = parseFloat( RegExp.$1 ); // capture x.x portion and store as a number
    if (ieversion >= 8)
    {
      return true;
    }
  }
  else if (/Trident\/.*rv[ :]([\d\.]+)/.test( navigator.userAgent )) //test for new MSIE (11 and higher)
  {
    var ieversion = parseFloat( RegExp.$1 ); // capture x.x portion and store as a number
    if (ieversion >= 11)
    {
      return true;
    }
  }
  return false;
};

// Find an element with the given className, starting with the element passed in
page.util.upToClass = function ( element, className )
{
  while (element && !page.util.hasClassName(element, className))
  {
    element = element.parentNode;
  }
  return $(element);
};

page.util.isRTL = function ()
{
  var els = document.getElementsByTagName("html");
  var is_rtl = (typeof(els) != 'undefined' &&
          els && els.length == 1 && els[0].dir == 'rtl' );
  return is_rtl ;
};

page.util.allImagesLoaded = function (imgList)
{
  var allDone = true;
  if (imgList)
  {
    for ( var i = 0, c = imgList.length; i < c; i++ )
    {
      var animg = imgList[i];
      // TODO - this doesn't appear to work on IE.
      if ( !animg.complete )
      {
        allDone = false;
        break;
      }
    }
  }
  return allDone;
};

// Exposes (display but keep invisible) an invisible element for measurement
// recursively traverses up the DOM looking for
// a parent node of element whose display == 'none'
// If found, sets its style to: display:block, position:absolute, and visibility:hidden
// and saves it as element.hiddenNode so it can be easily unexposed
page.util.exposeElementForMeasurement = function ( element )
{
  element = $(element);
  var e = element;
  var hiddenNode;
  // find parent node that is hidden
  while ( !hiddenNode && e && e.parentNode)
  {
    if ( $(e).getStyle('display') === 'none')
    {
      hiddenNode = $(e);
    }
    e = $(e.parentNode);
  }
  if ( hiddenNode )
  {
    // save original style attributes: visibility, position, & display
    element.hiddenNode = hiddenNode;
    var style = hiddenNode.style;
    var originalStyles = {
                          visibility: style.visibility,
                          position:   style.position,
                          display:    style.display
                        };
    var newStyles = {
                     visibility: 'hidden',
                     display:    'block'
                   };

     if (originalStyles.position !== 'fixed')
     {
       newStyles.position = 'absolute';
     }
     hiddenNode.originalStyles = originalStyles;
     // set new style for: visibility, position, & display
     hiddenNode.setStyle( newStyles );
  }

};

// undo previous call to exposeElementForMeasurement
page.util.unExposeElementForMeasurement = function ( element )
{
  element = $(element);
  if ( element && element.hiddenNode && element.hiddenNode.originalStyles )
  {
    Element.setStyle( element.hiddenNode, element.hiddenNode.originalStyles );
    element.hiddenNode.originalStyles = null;
    element.hiddenNode = null;
  }

};


/**
 * Returns whether any part of the two elements overlap each other.
 */
page.util.elementsOverlap = function ( e1, e2 )
{
  var pos1 = $(e1).cumulativeOffset();
  var a = { x1: pos1.left, y1: pos1.top, x2: pos1.left + e1.getWidth(), y2: pos1.top + e1.getHeight() };
  var pos2 = $(e2).cumulativeOffset();
  var b = { x1: pos2.left, y1: pos2.top, x2: pos2.left + e2.getWidth(), y2: pos2.top + e2.getHeight() };

  return a.x1 < b.x2 && a.x2 > b.x1 && a.y1 < b.y2 && a.y2 > b.y1;
};
/**
 *  To handle the case where the focus is visible but too close to the
    bottom of the page, scroll the page up a bit.
    Note: when using scrollbar.js, use scrollBar.scrollTo() rather than focusAndScroll
*/

page.util.focusAndScroll= function(elem)
{
  elem.focus();

  return page.util.ensureVisible(elem);
};

page.util.ensureVisible= function(elem)
{
  var scrolltop = document.viewport.getScrollOffsets().top;
  var mytop = elem.cumulativeOffset()[1];
  var height = document.viewport.getDimensions().height;
  var realtop = mytop - scrolltop;
  var thirty = height * 0.3;
  if (realtop > (height-thirty))
  {
    var scrollDistance = realtop - thirty;
    window.scrollBy(0,scrollDistance);
  }
  return false;
};

page.util.processJSProtoString = function (string, checkToken) {
  // This value must match the value passed as the 2nd parameter to this string.
  // The goal is to pass a known value, as a constant, through the javascript: pseudo-protocol
  // handler. We can then examine the result to determine the decoding method used by the current
  // browser.
  var sniffToken = '%C3%A9';

  // There are three known decoding cases, non-translated, UTF8, and unescape
  if (checkToken === unescape(sniffToken)) {
    // Unescape decoded
    return decodeURIComponent(escape(string));
  } else if (checkToken === sniffToken) {
    // Non-translated
    return decodeURIComponent(string);
  } else {
    // UTF8 Decoded/Unknown
    return string;
  }
};

/**
 * Find the first action bar that precedes sourceElement
 * Returns the action bar div element if found, null otherwise
 *
 * @param sourceElement
 */
page.util.findPrecedingActionBar = function( sourceElement )
{
  var actionBar = null;
  // Loop through each ancestor of sourceElement,
  // starting with parent, until an action bar is found
  sourceElement.ancestors().each( function( item )
  {
    actionBar = item.previous('div.tabActionBar') ||
                item.previous('div.actionBarMicro') ||
                item.previous('div.actionBar');
    if (actionBar)
    {
      throw $break;
    }
  });
  return actionBar;
};

page.util.getLargestDimensions = function (element)
{
  var width = 0;
  var height = 0;
  var dim;
  while (element != document)
  {
    dim = $(element).getDimensions();
    if (dim.width > width)
    {
      width = dim.width;
    }
    if (dim.height > height)
    {
      height = dim.height;
    }
    element = element.up();
  }
    return { width: width, height: height };
};

/*
 * Resize the current window so that it will fit the largest dimensions found for the given element.
 * Will also reposition on the screen if required to fit.  Will not size larger than the screen.
 * NOTE that this will only work for popup windows - main windows are typically in a tabset in
 * the browser and they don't allow resizing like this.  That's OK because the main use case
 * for this method is to make sure popup windows are resized appropriately for their content.
 */
page.util.resizeToContent = function (startElement)
{
    var dim = page.util.getLargestDimensions(startElement);
    var newWidth = dim.width;
    newWidth += 25; // TODO: Haven't figured out why I need this extra space yet...
    if (window.innerWidth > newWidth)
    {
      newWidth = window.innerWidth;
    }
    if (newWidth > screen.width)
    {
      newWidth = screen.width;
    }

    var newHeight = dim.height;
    newHeight += 100; // TODO: Haven't figured out why I need this extra space yet
    if (window.innerHeight > newHeight)
    {
      newHeight = window.innerHeight;
    }
    if (newHeight > screen.height)
    {
      newHeight = screen.height;
    }

    var left = 0;
    var top = 0;
    if ( window.screenLeft )
    {
      left = window.screenLeft;
      top = window.screenTop;
    }
    else if ( window.screenX )
    {
      left = window.screenX;
      top = window.screenY;
    }
    if (left + newWidth > screen.width)
    {
      left = screen.width - newWidth;
      if (left < 0)
      {
        left = 0;
      }
    }
    if (top + newHeight > screen.height)
    {
      top = screen.height - newHeight;
      if (top < 0)
      {
        top = 0;
      }
    }
    window.moveTo(left,top);
    window.resizeTo(newWidth,newHeight);
};

/**
 * Sets the css position of all li elements that are contained in action bars on the page.
 * Since z-index only works on positioned elements, this function can be used to ensure that
 * divs with a higher z-index will always appear on top of any action bars on the page.
 *
 * @param cssPosition
 */
page.util.setActionBarPosition = function( cssPosition )
{
  $$( 'div.actionBar',
      'div.tabActionBar',
      'div.actionBarMicro' ).each( function( actionbar )
  {
    actionbar.select( 'li' ).each( function( li )
    {
      li.setStyle( {position: cssPosition} );
    });
  });
};

/**
 * Returns true if we are currently running inside Ultra, false otherwise.
 * @returns {Boolean}
 */
page.util.insideUltra = function()
{
  if ( top.__isUltraApp )
  {
    return true;
  }
  return false;
};

/**
 * Returns true if the current window's parent is the Ultra app, false otherwise.
 * @returns {Boolean}
 */
page.util.parentWindowIsUltraApp = function()
{
  if ( parent.__isUltraApp )
  {
    return true;
  }
  return false;
};

/**
 * Utility method to broadcast event to angular realm
 * @param {string} name Event name to broadcast.
 * @param {...*} args Optional one or more arguments which will be passed onto the event listeners.
 * @returns {boolean} True if angular is available, false otherwise.
 */
page.util.broadcastToUltra = function( name, args )
{
  if ( page.util.insideUltra() && window.top.angular )
  {
    // Angular is available, so broadcast the event to Ultra
    var scope = window.top.angular.element( window.top.document ).injector().get( '$rootScope' );
    scope.$broadcast.apply(scope, arguments);
    return true;
  }
  return false;
};

/**
 * Utility methods to pin the bottom Submit step at the bottom of window or
 * container whichever is applicable.
 * This function is invoked on all the pages which have the submit button being rendered either via stepSubmit tag or directly.
 * The pages including, but not limited to,
 * Course Item create/edit page
 * Course Video create/edit page
 * Edit/reply discussion message(s) on Course discussion thread page
 * Institution Domain create/edit page
 * Institution Brand customize page
 * The classic edit page of Configure Collaborate Web Conference in light box (See LRN-112422)
 *
 * Any time this function is being updated, the pages above or any page has the Submit button need be manually tested. The test should be performed on
 * the emulated mobile devices in addition to the desktop. Also, the test needs cover the two supported themes, as_2012 and as_2015.
 */
page.util.pinBottomSubmitStep = function( bottomSubmit, lightboxDiv )
{
  var placeHolderDividerName = 'bottomSubmitPlaceHolder';
  var submitStepFixedStyle = 'submitStepFixed';
  var spaceUnderLightbox = 0;
  var isSubmitOutOfLightbox = false;
  var isContainerOutOfLightbox = false;

  var container = bottomSubmit.parentElement;
  var viewPortHeight = document.viewport.getDimensions().height;
  var isPinned = page.util.hasClassName(bottomSubmit, submitStepFixedStyle);
  // bottomSubmitPlaceHolder holds the place of submit step within the
  // container when the step is pinned to bottom of window to make sure the
  // container doesn't shrink.
  // It also be used to keep the original attributes for the submit step div, i.e. the width.
  var bottomSubmitPlaceHolder = document.getElementById(placeHolderDividerName);
  var bottomOfSubmit = parseInt(bottomSubmit.getBoundingClientRect().bottom, 10);

  if ( lightboxDiv && lightboxDiv.contains( container ) )
  {
    var bottomOfLightbox = parseInt(lightboxDiv.getBoundingClientRect().bottom, 10);
    spaceUnderLightbox = viewPortHeight - bottomOfLightbox;
    isContainerOutOfLightbox = (parseInt(container.getBoundingClientRect().bottom, 10) > bottomOfLightbox);
    isSubmitOutOfLightbox = (bottomOfSubmit > bottomOfLightbox);
  }

  // In case the bottom of submit button is below then the bottom of window, or the container/submit button is out of available light box,
  // pin the submit step to the bottom of browser by adding the css class 'submitStepFixed'.
  if (!isPinned && (( viewPortHeight - bottomOfSubmit ) < 0  || isContainerOutOfLightbox || isSubmitOutOfLightbox)) {
    bottomSubmit.addClassName(submitStepFixedStyle);
    if ( spaceUnderLightbox >0 )
    {
      bottomSubmit.style.marginBottom = spaceUnderLightbox+'px';
    }
    page.util.setPinnedBottomSubmitStepWidth( bottomSubmit, container );
    if ( !bottomSubmitPlaceHolder ) {
      bottomSubmitPlaceHolder = document.createElement('div');
      bottomSubmitPlaceHolder.id = placeHolderDividerName;
      container.insertBefore(bottomSubmitPlaceHolder,bottomSubmit);
    }
    bottomSubmitPlaceHolder.style.height = bottomSubmit.getDimensions().height + 'px';
  }
  else if ( isPinned ) {
  //The width of the pinned submit button div might need be updated upon the event of resizing.
    page.util.setPinnedBottomSubmitStepWidth( bottomSubmit, container );

    // The submit button div should be set back to the container by removing the class 'submitStepFixed'
    // if the top of submit button is higher than the place holder.
    if ( !bottomSubmitPlaceHolder || (bottomSubmit.getBoundingClientRect().top > bottomSubmitPlaceHolder.getBoundingClientRect().top) ) {
      if ( bottomSubmitPlaceHolder ) {
        bottomSubmit.style.width = bottomSubmitPlaceHolder.style.width;
        bottomSubmitPlaceHolder.remove();
      }
      bottomSubmit.style.marginBottom = 'auto';
      bottomSubmit.removeClassName( submitStepFixedStyle );
    }
  }
};

/**
 * Sets the width for the pinned bottom submit div.
 */
page.util.setPinnedBottomSubmitStepWidth = function( pinnedBottomSubmit, container )
{
  var computedStyle;
  if (document.defaultView && document.defaultView.getComputedStyle) {
    computedStyle = document.defaultView.getComputedStyle(pinnedBottomSubmit, null);
  };
  var pinnedButtonWidth = container.offsetWidth;
  if ( computedStyle ) {
    if ( computedStyle.paddingLeft) {
      pinnedButtonWidth = pinnedButtonWidth - parseInt(computedStyle.paddingLeft, 10);
    }
    if ( computedStyle.paddingRight){
      pinnedButtonWidth = pinnedButtonWidth - parseInt(computedStyle.paddingRight, 10);
      }
    }
  pinnedBottomSubmit.style.width = pinnedButtonWidth + 'px';
};

/**
 * Utility to invoke page.util.pinBottomSubmitStep function initially
 * and bind the function to the events of resize, scroll and menu toggling.
 */
page.util.initPinBottomSubmitStep = function() {
  var bottomSubmitToBePinned = page.util.getBottomSubmitStep();
  if (!bottomSubmitToBePinned) {
    return;
  }
  var lightboxDiv = page.util.upToClass( bottomSubmitToBePinned, "lb-content" );
  if ( lightboxDiv ) {
    Event.observe(lightboxDiv, 'resize', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)})
    Event.observe(lightboxDiv, 'scroll', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});
   } else {
    //Invoke the pinBottomSubmitStep initially if the submit button div is not in a light box.
    //If the submit button is in a light box, pinBottomSubmitStep is called by _initializeBottomSubmitStep() from
    //lightbox.js which is guaranteed to be executed after the light box content being fully rendered.
    page.util.pinBottomSubmitStep( bottomSubmitToBePinned, null );
  }

  //The resize and scroll event could be fired either on window or body element according to the overflow setting,
  //therefore the pinning function is bound to both events.
  Event.observe(window, 'resize', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});
  Event.observe(window, 'scroll', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});
  var body = document.getElementsByTagName("body")[0];
  if (body) {
    Event.observe(body, 'resize', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});
    Event.observe(body, 'scroll', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});
  }
  // also bind to the custom event so we can use Event.fire(window, "bb:resize") in other places
  Event.observe(window, 'bb:resize', function() {page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)});

  page.util.registerScrollTotopIfCovered(bottomSubmitToBePinned.parentElement, bottomSubmitToBePinned);

  //Adjust the sticky footer upon the menu toggling event.
  (function() {
    if ( page.PageMenuToggler.toggler ) {
      page.PageMenuToggler.toggler.addToggleListener( function( isOpen ) {
        page.util.pinBottomSubmitStep(bottomSubmitToBePinned, lightboxDiv)
      });
    }
  }.defer());
};

/**
 * Register focus event handler to all the elements within same container of the submit button div,
 * so that the page will be lifted up in case the focused element is covered by the submit button.
 */
page.util.registerScrollTotopIfCovered = function( parent, bottomSubmit) {
  var children = parent.childNodes;
  for (var i=0; i<children.length; i++) {
    if (children[i] != bottomSubmit) {
      if (children[i].childNodes.length>0) {
        page.util.registerScrollTotopIfCovered(children[i],bottomSubmit);
      } else {
        Event.observe( children[i], 'focus', page.util.scrollTotopIfCovered.bindAsEventListener( this, bottomSubmit ) );
      }
    }
  }
}

/**
 * If the element associated with the event if covered by the bottom submit div,
 * lift the page via scrollIntoView method.
 */
page.util.scrollTotopIfCovered = function(event, bottomSubmit) {
  var focusedElement = Event.element(event);
  var bottomOfFocusedElement = parseInt(focusedElement.getBoundingClientRect().bottom, 10);
  var topOfFooter = parseInt(bottomSubmit.getBoundingClientRect().top, 10);
  if (bottomOfFocusedElement > topOfFooter) {
    focusedElement.scrollIntoView(true);
  }
}

/**
 * The method returns the element contains the submit button. This element needs be pinned at the bottom of window or
 * container whichever is applicable.
 */
page.util.getBottomSubmitStep = function() {
  var bottomSubmitStep;
  var navStatusPanelButtonsBottom = document.getElementById("navStatusPanelButtons_bottom");
  if (navStatusPanelButtonsBottom){
    bottomSubmitStep = navStatusPanelButtonsBottom.parentElement;
  }
  if (!bottomSubmitStep) {
    bottomSubmitStep = document.getElementsByClassName("submitStepBottom")[0];
  }
  if (!bottomSubmitStep) {
      bottomSubmitStep = document.getElementById("submitButtonRow");
  }
  if (!bottomSubmitStep) {
    var submitButtonRow = document.getElementById("bottom_submitButtonRow");
    if ( submitButtonRow )
    {
      bottomSubmitStep = submitButtonRow.parentElement;
    }
  }
  return bottomSubmitStep;
};

/**
 * We have many anchor elements with a role of 'button' that present something visually looking like a button but that
 * do not respond to 'space' to press them as you would expect of a button. This will setup space to fire the click
 * event on any element with a role of 'button'.
 */
page.GlobalBehaviour = Class.create();
page.GlobalBehaviour.prototype =
{
  initialize : function()
  {
    Event.observe( window, 'keydown', this.handleKeyDown.bindAsEventListener( this ) );

  },
  handleKeyDown : function( event )
  {
    var code = event.keyCode || event.which;
    var elem = event.element();
    // space (32) on an anchor tag, or enter key (13)
    if ( (code == 32 && elem.nodeName.toUpperCase() === 'A') || code == 13)
    {
      var role = elem.getAttribute("role");
      if (role && role == "button")
      {
        page.util.fireClick( elem );
        $(event).preventDefault();
      }
    }
  }
};
/** We want this behaviour everywhere so establish it immediately.*/
page.theGlobalBehaviour = new page.GlobalBehaviour();

/**
 * Class for controlling the course menu-collapser.  Also ensures the menu is
 * the right height
 */
page.PageMenuToggler = Class.create();
page.PageMenuToggler.prototype =
{
  /**
   * initialize
   */
  initialize: function( isMenuOpen,key,temporaryScope )
  {
    page.PageMenuToggler.toggler = this;
    this.key = key;
    if (temporaryScope)
    {
      this.temporaryScope = temporaryScope;
    }
    else
    {
      this.temporaryScope = false;
    }
    this.isMenuOpen = isMenuOpen;
    this.puller = $('puller');
    this.menuPullerLink = $(this.puller.getElementsByTagName('a')[0]);
    this.menuContainerDiv = $('menuWrap');
    this.navigationPane = $('navigationPane');
    this.contentPane = $('contentPanel') || $('contentPane');
    this.navigationPane = $('navigationPane');
    this.locationPane = $(this.navigationPane.parentNode);
    this.globalContent = $(this.locationPane.parentNode);
    this.body = $(this.globalContent.parentNode);
    this.breadcrumbBar = $('breadcrumbs');

    this.menu_pTop = parseInt(this.menuContainerDiv.getStyle('paddingTop'), 10);
    this.menu_pBottom = parseInt(this.menuContainerDiv.getStyle('paddingBottom'), 10);
    this.loc_pTop = parseInt(this.locationPane.getStyle('paddingTop'), 10);

    if ( this.breadcrumbBar )
    {
      this.bc_pTop = parseInt(this.breadcrumbBar.getStyle('paddingTop'), 10);
      this.bc_pBottom = parseInt(this.breadcrumbBar.getStyle('paddingBottom'), 10);
    }
    else
    {
      this.bc_pTop = 0;
      this.bc_pBottom = 0;
    }

    this.toggleListeners = [];
    this.onResize( null );  // fix the menu size

    this.collapseCourseMenuIfWidthTooSmall();

    // Doesn't work in IE or Safari..
    //Event.observe( window, 'resize', this.onResize.bindAsEventListener( this ) );
    Event.observe( this.menuPullerLink, 'click', this.onToggleClick.bindAsEventListener( this ) );
  },

  collapseCourseMenuIfWidthTooSmall: function()
  {
    if ( this.isLessThanMinWidthToDisplayCourseMenu() && this.isMenuOpen )
    {
      this.collapse();
    }
  },

  isLessThanMinWidthToDisplayCourseMenu: function()
  {
    var width = document.viewport.getWidth();
    // 768px is the iPad width
    var minWidthToAutoCollapseInPx = 1025;
    return width < minWidthToAutoCollapseInPx;
  },

  /**
   * Adds a listener for course menu toggle events
   */
  addToggleListener: function( listener )
  {
    this.toggleListeners.push( listener );
  },

  /**
   * Notifies all registered toggle event listeners that a toggle has occurred.
   */
  _notifyToggleListeners: function( isOpen )
  {
    this.toggleListeners.each( function( listener )
    {
      listener( isOpen );
    });
  },

  notifyToggleListeners: function( isOpen )
  {
    // we call once the toggle is complete and the DOM in its new state. 2012 themes add transition, which seems
    // to collide with the logic to get dimensions of dom element, so the delay is a 1 sec to let time for those
    // transitions to be done.
    this._notifyToggleListeners.bind( this, isOpen ).delay( 1 );
  },
  /**
   * getAvailableResponse
   */
  getAvailableResponse : function ( req  )
  {
    var originalMenuOpen = this.isMenuOpen ;
    if ( req.responseText.length > 0 )
    {
      if ( req.responseText == 'true' )
      {
        this.isMenuOpen = true;
      }
      else
      {
        this.isMenuOpen = false;
    }
    }

    if ( originalMenuOpen != this.isMenuOpen )
    {
      this.notifyToggleListeners( this.isMenuOpen );
      this.menuContainerDiv.toggle();
      this.puller.toggleClassName("pullcollapsed");
      this.contentPane.toggleClassName("contcollapsed");
      this.navigationPane.toggleClassName("navcollapsed");
      this.body.addClassName("bodynavcollapsed");
    }
  },



  /**
   * Expands the menu.  This can be used instead of toggling to explicitly
   * change the visibility of the menu.
   */
  expand : function ()
  {
    this.menuContainerDiv.show();
    this.puller.removeClassName("pullcollapsed");
    this.contentPane.removeClassName("contcollapsed");
    this.navigationPane.removeClassName("navcollapsed");
    this.body.removeClassName("bodynavcollapsed");

    this.isMenuOpen = true;

    var msg = page.bundle.messages[ "coursemenu.hide" ];
    this.menuPullerLink.title = msg;
    $('expander').alt = msg;

    this.notifyToggleListeners( true );
    if (this.temporaryScope)
    {
      UserDataDWRFacade.setStringTempScope( this.key, true );
    }
    else
    {
      UserDataDWRFacade.setStringPermScope( this.key, true );
    }
  },

  /**
   * Collapses the menu.  This can be used instead of toggling to explicitly
   * change the visibility of the menu.
   */
  collapse : function ()
  {
    this.menuContainerDiv.hide();
    this.puller.addClassName("pullcollapsed");
    this.contentPane.addClassName("contcollapsed");
    this.navigationPane.addClassName("navcollapsed");
    this.body.addClassName("bodynavcollapsed");

    this.isMenuOpen = false;

    var msg = page.bundle.messages[ "coursemenu.show" ];
    this.menuPullerLink.title = msg;
    $('expander').alt = msg;

    this.notifyToggleListeners( false );
    if (this.temporaryScope)
    {
      UserDataDWRFacade.setStringTempScope( this.key, false );
    }
    else
    {
      UserDataDWRFacade.setStringPermScope( this.key, false );
    }
  },

  /**
   * Event triggered when the puller toggle control is clicked.  Changes the
   * menu from open to closed or closed to open depending on existing state.
   */
  onToggleClick: function( event )
  {
    if ( this.isMenuOpen )
    {
      this.collapse();
    }
    else
    {
      this.expand();
    }
    Event.stop( event );
  },

  /**
   * onResize
   */
  onResize: function( event )
  {
      var menuHeight = this.menuContainerDiv.getHeight();
      var contentHeight = this.contentPane.getHeight();
      var maxHeight = ( menuHeight > contentHeight ) ? menuHeight : contentHeight;
      this.contentPane.setStyle({height: maxHeight + 'px'});
      this.navigationPane.setStyle({height: maxHeight + 'px'});
  }
};
page.PageMenuToggler.toggler = null;

/**
 *  Class for controlling the page help toggler in the view toggle area
 */
page.PageHelpToggler = Class.create();
page.PageHelpToggler.prototype =
{
  initialize: function( isHelpEnabled, showHelpText, hideHelpText, assumeThereIsHelp )
  {
    page.PageHelpToggler.toggler = this;
    this.toggleListeners = [];
    this.isHelpEnabled = isHelpEnabled;
    this.showText = showHelpText;
    this.hideText = hideHelpText;
    this.contentPanel = $('contentPanel') || $('contentPane');
    var helperList = [];
    if ( this.contentPanel && !assumeThereIsHelp)
    {
      var allElems = [];
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('p') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('div') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('li') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('span') ) );
      for ( var i = 0; i < allElems.length; i++ )
      {
        var el = allElems[i];
        if ( page.util.hasClassName( el, 'helphelp' ) ||
             page.util.hasClassName( el, 'stepHelp' ) ||
             page.util.hasClassName( el, 'taskbuttonhelp' ) ||
             page.util.hasClassName( el, 'pageinstructions' ) )
        {
          helperList.push( $(el) );
        }
      }
    }

    var helpTextToggleLink = $('helpTextToggleLink');
    if ( ( !helperList || helperList.length === 0) && !assumeThereIsHelp )
    {
      if ( helpTextToggleLink )
      {
        helpTextToggleLink.remove();
      }
    }
    else
    {
      if ( !isHelpEnabled )
      {
        helperList.invoke( "toggle" );
      }

      if ( !this.showText )
      {
        this.showText = page.bundle.getString("viewtoggle.editmode.showHelp");
      }

      if ( !this.hideText )
      {
        this.hideText = page.bundle.getString("viewtoggle.editmode.hideHelp");
      }

      helpTextToggleLink.style.display = 'inline-block';
      this.toggleLink = helpTextToggleLink;
      this.toggleImage = $(this.toggleLink.getElementsByTagName('img')[0]);
      Event.observe( this.toggleLink, "click", this.onToggleClick.bindAsEventListener( this ) );
      $(this.toggleLink.parentNode).removeClassName('hidden');
      this.updateUI();
    }
  },

  addToggleListener: function( listener )
  {
    this.toggleListeners.push( listener );
  },

  _notifyToggleListeners: function()
  {
    this.toggleListeners.each( function( listener )
    {
      listener( this.isHelpEnabled );
    });
  },

  notifyToggleListeners: function()
  {
    // we notify once the whole menu collapse/expand is done, so the DOM is in final state
    this._notifyToggleListeners.bind( this ).delay( );
  },


  updateUI: function( )
  {
    if ( this.isHelpEnabled )
    {
      $("showHelperSetting").value = 'true';
      this.toggleImage.src = getCdnURL( "/images/ci/ng/small_help_on2.gif" );
      this.toggleLink.setAttribute( "title", this.showText );
      this.toggleImage.setAttribute( "alt", this.showText );
    }
    else
    {
      $("showHelperSetting").value = 'false';
      this.toggleImage.src = getCdnURL( "/images/ci/ng/small_help_off2.gif" );
      this.toggleLink.setAttribute( "title", this.hideText );
      this.toggleImage.setAttribute( "alt", this.hideText );
    }
  },

  toggleHelpText : function( isEnabled )
  {
    if ( this.contentPanel )
    {
      var allElems = [];
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('p') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('div') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('li') ) );
      allElems = allElems.concat( $A(this.contentPanel.getElementsByTagName('span') ) );

      for ( var i = 0; i < allElems.length; i++ )
      {
        var el = allElems[i];
        if ( page.util.hasClassName( el, 'helphelp' ) ||
             page.util.hasClassName( el, 'stepHelp' ) ||
             page.util.hasClassName( el, 'taskbuttonhelp' ) ||
             page.util.hasClassName( el, 'pageinstructions' ) )
        {
          if(isEnabled) //if we upgrade to prototype 7.1, then we can just do $(el).toggle(isEnabled)
          $(el).show();
          else
          $(el).hide();
        }
      }
    }
  },

  onToggleClick: function( event )
  {
    // Toggle all elements that have the css class "helphelp"
    var helperList = [];

    if ( this.isHelpEnabled )
    {
      this.isHelpEnabled = false;
      UserPageInstructionsSettingDWRFacade.setShowPageInstructions( "false" );
    }
    else
    {
      this.isHelpEnabled = true;
      UserPageInstructionsSettingDWRFacade.setShowPageInstructions( "true" );
    }
    //after updating isHelpEnabled value, actually change the text visibility
    this.toggleHelpText( this.isHelpEnabled );

    this.updateUI();
    this.notifyToggleListeners();
    Event.stop( event );
  }
};

/**
 * Class for controlling the display of a context menu.
 */
page.ContextMenu = Class.create();
page.ContextMenu.prototype =
{
  initialize: function( contextMenuContainer, divId, forceMenuRefresh )
  {
    this.displayContextMenuLink = contextMenuContainer.down("a.cmimg");
    // in grade-center screen reader mode 'cmimg' class is removed.
    // insertAccessibleContextMenu method in gradebookgrid_cellctrl.js removes the 'cmimg' class
    if ( !this.displayContextMenuLink )
    {
      this.displayContextMenuLink = contextMenuContainer.down('a');
    }
    this.contextMenuContainer = contextMenuContainer;
    this.forceMenuRefresh = forceMenuRefresh;
    this.uniqueId = this.displayContextMenuLink.id.split('_')[1];
    this.contextMenuDiv = this.displayContextMenuLink.savedDiv;
    if ( !this.contextMenuDiv )
    {
      this.contextMenuDiv = contextMenuContainer.down("div");//$('cmdiv_' + this.uniqueId);
      if ( !this.contextMenuDiv )
      {
        this.contextMenuDiv = page.ContextMenu.locateMenuDiv( this.displayContextMenuLink, this.uniqueId );
      }
      this.displayContextMenuLink.savedDiv = this.contextMenuDiv;
      page.ContextMenu.hiddenDivs.set(divId,this.contextMenuDiv);
    }

    this.originalContextMenuDiv = this.contextMenuDiv.cloneNode(true);
    $(this.contextMenuDiv).setStyle({zIndex: 200});
    this.displayContextMenuLink.appendChild( this.contextMenuDiv ); // Temporarily add the menu back where it started
    this.closeContextMenuLink = contextMenuContainer.down(".contextmenubar_top").down(0);
    this.contextParameters = contextMenuContainer.readAttribute("bb:contextParameters");
    this.menuGeneratorURL = contextMenuContainer.readAttribute("bb:menuGeneratorURL");
    this.nav = contextMenuContainer.readAttribute("bb:navItem");
    this.enclosingTableCell = contextMenuContainer.up("td");
    this.menuOrder = contextMenuContainer.readAttribute("bb:menuOrder");
    this.overwriteNavItems = contextMenuContainer.readAttribute("bb:overwriteNavItems");
    this.beforeShowFunc = contextMenuContainer.readAttribute("bb:beforeShowFunc");
    if (this.beforeShowFunc)
    {
      this.beforeShowFunc = eval(this.beforeShowFunc);
    }

    if ( this.menuOrder )
    {
      this.menuOrder = this.menuOrder.split(',');
    }

    if ( !this.contextParameters )
    {
      this.contextParameters = "";
    }

    if ( !this.menuGeneratorURL )
    {
      this.menuGeneratorURL = "";
    }

    if ( !this.nav )
    {
      this.nav = "";
    }

    this.dynamicMenu = false;

    if ( this.menuGeneratorURL )
    {
      this.dynamicMenu = true;
    }

    // Process dynamic menus to hide contextMenuLinks if it is for an empty menu. Do that before attaching events to the links
    this.processDynamicMenu();

    if (this.dynamicMenu)
    {
      Event.observe( this.displayContextMenuLink, "click", this.generateDynamicMenu.bindAsEventListener( this ) );
    }
    else
    {
      Event.observe( this.displayContextMenuLink, "click", this.onDisplayLinkClick.bindAsEventListener( this ) );
    }

    Event.observe( this.closeContextMenuLink, "click", this.onCloseLinkClick.bindAsEventListener( this ) );
    Event.observe( this.contextMenuDiv, "keydown", this.onKeyPress.bindAsEventListener( this ) );

    // adding nowrap to table cell containing context menu
    // If no enclosing td is found, try th
    if ( !this.enclosingTableCell )
    {
      this.enclosingTableCell = contextMenuContainer.up("th");
    }

    if ( this.enclosingTableCell )
    {
      if ( !this.enclosingTableCell.hasClassName("nowrapCell") )
      {
        this.enclosingTableCell.addClassName("nowrapCell");
      }

      // if label tag is an immediate parent of context menu span tag, it needs nowrap as well
      if ( this.enclosingTableCell.down("label") && !this.enclosingTableCell.down("label").hasClassName("nowrapLabel"))
      {
        this.enclosingTableCell.down("label").addClassName("nowrapLabel");
      }
    }

    if ( !this.dynamicMenu )
    {
      var contexMenuItems = contextMenuContainer.getElementsBySelector("li > a").each( function (link )
      {
        if ( !link.up('li').hasClassName("contextmenubar_top") )
        {
          Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
          Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
        }
      }.bind( this ) );
    }

    this.useARIA = page.util.useARIA();

    // remove the context menu div from the page for performance reasons - add it back when we need to show it
    Element.remove( this.contextMenuDiv );
  },

  onKeyPress: function( event )
  {
    var elem, children, index;
    var key = event.keyCode || event.which;
    if ( key == Event.KEY_UP )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index > 0 )
      {
        children[index - 1].focus();
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_DOWN )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index < ( children.length - 1 ) )
      {
        children[index + 1].focus();
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_ESC )
    {
      this.close();
      this.displayContextMenuLink.focus();
      Event.stop( event );
    }
    else if ( key == Event.KEY_TAB )
    {
      elem = Event.element ( event );
      children = this.contextMenuDiv.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( (!event.shiftKey && index == children.length - 1) || (event.shiftKey && index === 0))
      {
        this.close();
        this.displayContextMenuLink.focus();
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_RETURN )
    {
      if ( this.useARIA )
      {
        elem = Event.element ( event );
        (function() { page.util.fireClick( elem ); }.bind(this).defer());
        Event.stop( event );
      }
    }
  },

  onAnchorFocus: function ( event )
  {
    Event.element( event ).setStyle({ backgroundColor: '#FFFFFF' });
  },

  onAnchorBlur: function( event )
  {
    Event.element( event ).setStyle({ backgroundColor: '' });
  },

  afterMenuGeneration: function( dynamicMenusCacheKey, showMenu, req )
  {
    if ( this.dynamicMenu )
    {
      var result;
      this.dynamicMenu =  this.forceMenuRefresh;
      try
      {
        var contentMenuHTMLList;
        if( req )
        {
          result = req.responseText.evalJSON( true );
          if ( result && result.success == "true" )
          {
            contentMenuHTMLList = result.contentMenuHTMLList;
            page.ContextMenu.dynamicMenus.set(dynamicMenusCacheKey, contentMenuHTMLList)
          }
          else
          {
            new page.InlineConfirmation("error", result.errorMessage, false );
          }
        }
        else
        {
          contentMenuHTMLList = page.ContextMenu.dynamicMenus.get(dynamicMenusCacheKey);
        }
        if( undefined !== contentMenuHTMLList )
        {
          // append uniqueId to each li
          var menuHTML = contentMenuHTMLList.replace(/(<li.*?id=")(.*?)(".*?>)/g,"$1$2_"+this.uniqueId+"$3");
          if ( this.forceMenuRefresh )
          {
             this.contextMenuDiv.innerHTML = this.originalContextMenuDiv.innerHTML;
          }
          this.contextMenuDiv.insert({bottom:menuHTML});
          $A(this.contextMenuDiv.getElementsByTagName("ul")).each( function( list, index )
          {
            list.id = 'cmul'+index+'_'+this.uniqueId;
          }.bind(this) );
          var contexMenuItems = this.contextMenuDiv.getElementsBySelector("li > a").each( function (link )
          {
            if ( !link.up('li').hasClassName("contextmenubar_top") )
            {
              Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
              Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
             }
          }.bind( this ) );
        }
      }
      catch ( e )
      {
         new page.InlineConfirmation("error", result.errorMessage, false );
      }
    }

    if( showMenu )
    {
      this.showMenu();
      //focus on the first menu item
      (function() { this.contextMenuDiv.down("a").focus(); }.bind(this).defer());
    }
    else
    {
      this.processEmptyGroupsAndEmptyMenu(this.hideContextMenuLink, this.showContextMenuLink);
    }
  },

  appendItems: function( items, menuItemContainer )
  {
    if (!menuItemContainer)
    {
      var uls = this.contextMenuDiv.getElementsBySelector("ul");
      menuItemContainer = uls[uls.length-1];
    }

    items.each( function ( item )
    {
      if ( item.type == "seperator" )
      {
        if (menuItemContainer.getElementsBySelector("li").length === 0)
        {
          return;
        }
        var ul = new Element('ul');
        menuItemContainer.parentNode.appendChild( ul );
        menuItemContainer = ul;
        return;
      }
      if ( !this.menuItemTempate )
      {
        var menuItems = this.contextMenuDiv.getElementsBySelector("li");
        this.menuItemTempate = menuItems[menuItems.length-1];
      }
      var mi = this.menuItemTempate.cloneNode( true );
      var a  =  mi.down('a');
      var name = item.key ? page.bundle.getString( item.key ) : item.name ? item.name : "?";
      a.update( name );
      a.title = item.title ? item.title : name;
      a.href = "#";
      menuItemContainer.appendChild( mi );
      Event.observe( a, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
      Event.observe( a, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
      Event.observe( a, 'click', this.onItemClick.bindAsEventListener( this, item.onclick, item.doNotSetFocusOnClick ) );
    }.bind( this ) );

  },

  onItemClick: function( evt, func, doNotSetFocusOnClick )
  {
    this.onCloseLinkClick( evt, doNotSetFocusOnClick );
    func();
  },

  setItems: function( items )
  {
    // rather than try to match up new items with existing items, it's easier to delete the existing items
    // (except for the close item) and then add the new items

    // remove existing menu items, except close menu
    var menuItems = this.contextMenuDiv.getElementsBySelector("li").each( function (li )
    {
      if ( !li.hasClassName("contextmenubar_top") )
      {
        if (!this.menuItemTempate)
        {
          this.menuItemTempate = li;
        }
        li.stopObserving();
        li.remove();
      }
    }.bind( this ) );

    // should only be one menuItemContainer
    var menuItemContainers = this.contextMenuDiv.getElementsBySelector("ul").each( function (ul)
    {
      if ( !ul.down("li") )
      {
        ul.remove();
      }
    }.bind( this ) );

    this.appendItems(items, menuItems[0].parentNode);
  },

  // hide context menu groups that has all of its menu items hidden.
  // All children A nodes OR all children LI nodes should be explicitly marked hidden for their parent node to get hidden
  // In other words, UL or LI element without any child node won't get hidden.
  // UL or LI element may have no child element at this time if they were to be inserted later. (ie. GC grid's cell context menu)
  processEmptyGroupsAndEmptyMenu : function(callBackOnEmptyMenu, callBackOnNonEmptyMenu)
  {
    var cmdiv = this.contextMenuDiv;
    var counter = {ul: 0, ulH: 0 /* hidden ul */, li: 0, liH: 0, as: 0 /* link (A node) or label (Span node) */, asH: 0};
    Array.prototype.slice.call(cmdiv.getElementsByTagName('ul')).each(function(ul) {
      // the contextmenubar always shows and it shouldn't be a factor in finding out whether there's any menu time to show or not
      // unless it's got siblings in the same menu group
      var firstLiChild = ul.down('li');
      if(!firstLiChild || (page.util.hasClassName(firstLiChild, 'contextmenubar_top')) && ul.childElementCount === 1) {
        return;
      }
      counter.ul += 1;
      counter.li = 0; //reset for this particular ul
      counter.liH = 0; //reset for this particular ul
      var isUlHidden = page.util.hasClassName(ul, 'cmul-hide');
      if (!isUlHidden) {
        Array.prototype.slice.call(ul.getElementsByTagName('li')).each(function(li) {
          var firstAChild = li.down('a');
          var labelMenuItems = li.childElements().grep(new Selector('span.labelMenuItem'));
          if(!firstAChild && labelMenuItems.size() < 1) {
            return;
          }
          counter.li += 1;
          counter.as = 0; //reset for this particular li
          counter.asH = 0; //reset for this particular li
          // Note that a hidden label item has 'cmitem-hide' set on LI node whereas a hidden non-label/link item has 'cmitem-hide' set on A node
          var isLiHidden = page.util.hasClassName(li, 'cmli-hide') || page.util.hasClassName(li, 'cmitem-hide') || page.util.hasClassName(li, 'contextmenubar_top');
          if (!isLiHidden) {
            Array.prototype.slice.call(li.getElementsByTagName('a')).each(function(a) {
              counter.as += 1;
              if (page.util.hasClassName(a, 'cmitem-hide')) {
                counter.asH += 1;
              }
            });
            Array.prototype.slice.call(labelMenuItems).each(function() {
              counter.as += 1;
            });
            if (counter.asH === counter.as) {
              // all the links and labels are hidden - hide the parent li
              li.addClassName('cmli-hide');
              isLiHidden = true;
            }
          }
          if (isLiHidden) {
            counter.liH += 1;
          }
        });
        // all the list items in the group(ul) are hidden - hide the group
        if (counter.liH === counter.li ) {
          ul.addClassName('cmul-hide');
          isUlHidden = true;
        }
      }
      if(isUlHidden) {
        counter.ulH += 1;
      }
    });
    if (counter.ulH === counter.ul) {
      // all the menu groups in the context menu other than the contextmenubar are hidden
      if( callBackOnEmptyMenu )
      {
        callBackOnEmptyMenu.apply(this);
      }
    }
    else
    {
      if( callBackOnNonEmptyMenu )
      {
        callBackOnNonEmptyMenu.apply(this);
      }
    }
  },

  createEmptyContextMenu : function()
  {
    var emptyContextMenuLI = this.contextMenuDiv.down(".contextmenu_empty");
    if( !emptyContextMenuLI )
    {
      // create a group and a list item to display an empty context menu with
      var ulElement = $(document.createElement("ul"));
      var liElement = $(document.createElement("li"));
      liElement.addClassName('contextmenu_empty');
      if ( this.useARIA )
      {
        ulElement.setAttribute('role','presentation');
      }
      ulElement.insert({bottom:liElement});
      this.contextMenuDiv.insertBefore(ulElement, this.contextMenuDiv.down(".contextmenubar_top").up('ul').nextSibling);
    }
  },

  removeEmptyContextMenu : function()
  {
    var emptyContextMenuLI = this.contextMenuDiv.down(".contextmenu_empty");
    if( emptyContextMenuLI )
    {
      emptyContextMenuLI.up('ul').remove();
    }
  },

  showMenu : function()
  {
    if (this.beforeShowFunc)
    {
      this.beforeShowFunc(this);
    }
    page.ContextMenu.registerContextMenu( this );
    this.reorderMenuItems();
    if ( this.useARIA )
    {
      this.initARIA();
    }

    // Note that this should be called after 'this.reorderMenuItems()' since the latter re-generate ul elements losing any property added to them
    this.processEmptyGroupsAndEmptyMenu(this.createEmptyContextMenu, this.showContextMenuLink);

    var offset = this.displayContextMenuLink.cumulativeOffset();
    var scrollOffset = this.displayContextMenuLink.cumulativeScrollOffset();
    var viewportScrollOffset = document.viewport.getScrollOffsets();
    if ( this.displayContextMenuLink.up( 'div.lb-content' ) )
    {
      // Fix offset for context menu link inside a lightbox
      offset[0] = offset[0] + viewportScrollOffset[0];
      offset[1] = offset[1] + viewportScrollOffset[1];
    }
    else
    {
      // Fix the offset if the item is in a scrolled container
      offset[0] = offset[0] - scrollOffset[0] + viewportScrollOffset[0];
      offset[1] = offset[1] - scrollOffset[1] + viewportScrollOffset[1];
    }
    document.body.appendChild( this.contextMenuDiv );
    this.contextMenuDiv.setStyle({display: "block"});
    var width = this.contextMenuDiv.getWidth();
    var bodyWidth = $(document.body).getWidth();

    if ( page.util.isRTL() )
    {
      offset[0] = offset[0] + this.displayContextMenuLink.getWidth() - width;
    }

    if ( offset[0] + width > bodyWidth )
    {
      offset[0] = offset[0] - width + 30;
    }

    if ( this.keepMenuToRight )
    {
      // In case the link is very wide (i.e. gradecenter accessible mode cell link for really wide cell)
      // make sure the menu renders to the right side of the link
      var linkWidth = this.displayContextMenuLink.getDimensions().width;
      if (linkWidth > width)
      {
        // Only worry if the link is actually wider than the menu
        offset[0] += (linkWidth-width);
      }
    }

    // Don't start the menu off the left side of the window
    if ( offset[0] < 0 )
    {
      offset[0] = 0;
    }

    var height = this.contextMenuDiv.getHeight();
    var bodyHeight = $(document.body).getHeight();
    if (bodyHeight === 0)
    {
      // TODO This is kindof a hack since body height == 0 on a stream page, but we hacked in a special case for
      // lb-content above so it isn't entirely unheard of... would just be nicer to make this bodyheight choice
      // determined by the calling page rather than trial and error...
      var streamDiv = this.displayContextMenuLink.up( 'div.stream_full' );
      if (streamDiv)
      {
        bodyHeight = streamDiv.getHeight();
      }
    }
    var ypos = offset[1] + this.displayContextMenuLink.getHeight() + 17;
    if ( ( height + ypos ) > bodyHeight )
    {
      ypos -= height;
      ypos -= 34;
    }
    // Don't start the menu off the top of the screen
    if (ypos < 0 )
    {
      ypos = 0;
    }
    if (height > bodyHeight)
    {
      // If the menu is too big to fit on the screen, set it to the height of the screen and allow scrollbars inside the menu
      this.contextMenuDiv.setStyle({ height: bodyHeight + "px", overflowY: "auto", overflowX: "hidden", left: offset[0] + "px", top: ypos + "px" });
    }
    else
    {
      this.contextMenuDiv.setStyle({ left: offset[0] + "px", top: ypos + "px"});
    }
    if ( !this.shim )
    {
      this.shim = new page.popupShim( this.contextMenuDiv );
    }
    this.shim.open();
  },

  initARIA: function()
  {
    if ( !this.initializedARIA )
    {
      this.displayContextMenuLink.setAttribute( "aria-haspopup", "true" );
      this.displayContextMenuLink.setAttribute( "role", "menubutton" );
      this.contextMenuDiv.down( "ul" ).setAttribute( "role", "menu" );
      $A( this.contextMenuDiv.getElementsByTagName('a') ).each ( function( link )
      {
        if( !link.hasClassName("close-menu") ) {
          link.setAttribute( "role", "menuitem" );
          link.parentNode.setAttribute( "role", "presentation" );
        }
        if ( !link.href.include("#") )
        {
          Event.observe( link, 'click', function() {
            if ( this.ohref.toLowerCase().startsWith("javascript") )
            {
              eval( decodeURIComponent(this.ohref) );
            }
            else
            {
              if ( this.target )
              {
                window.open( this.ohref, this.target );
              }
              else
              {
                window.location = this.ohref;
              }
            }
          } );
          link.ohref = link.href;
          link.removeAttribute( "href" );
          link.tabIndex = "0";
          link.setStyle( {cursor: 'pointer'} ); // make it look like a link.
        }
      });
      this.initializedARIA = true; // Only initialize once.
    }
  },

  reorderMenuItems : function()
  {
    if ( !this.menuOrder || this.menuOrder.length < 2 )
    {
      return;
    }

    var orderMap = {};
    var closeItem = null;
    var extraItems = [];  // items not in order

    // Gather up all of the <li> tags in the menu and stick them in a map/object of id to the li object
    $A(this.contextMenuDiv.getElementsByTagName("li")).each( function( listItem )
    {
      if (listItem.hasClassName("contextmenubar_top"))
      {
        closeItem = listItem;
      }
      else
      {
        if (this.menuOrder.indexOf(listItem.id) > -1)
        {
          orderMap[listItem.id] = listItem;  // add item to map
        }
        else
        {
          extraItems.push(listItem); // listItem id not specified in menuOrder, so add listItem to extraItems
        }
      }
    }.bind(this) );

    // Remove all the content from the context menu div
    $A(this.contextMenuDiv.getElementsByTagName("ul")).each( function( list )
    {
      Element.remove(list);
    }.bind(this) );

    // Re-add the special "close" item as the first item.
    var ulElement = $(document.createElement("ul"));
    if ( this.useARIA )
    {
      ulElement.setAttribute('role','presentation');
    }
    this.contextMenuDiv.insert({bottom:ulElement});
    ulElement.insert({bottom:closeItem});

    // Loop through the order, adding a <ul> at the start, and starting a new <ul> whenever a "*separator*"
    //  is encountered, and adding the corresponding <li> for each of the ids in the order using the map/object
    this.menuOrder.each( function( id )
    {
      if (id == "*separator*")
      {
        ulElement = $(document.createElement("ul"));
        if ( this.useARIA )
        {
          ulElement.setAttribute('role','presentation');
        }
        this.contextMenuDiv.insert({bottom:ulElement});
      }
      else
      {
        ulElement.insert({bottom:orderMap[id]});
      }
    }.bind(this) );


    // Add any extraItems to thier own ul
    if (extraItems.length > 0)
    {
      ulElement = $(document.createElement("ul"));
      if ( this.useARIA )
      {
        ulElement.setAttribute('role','presentation');
      }
      this.contextMenuDiv.insert({bottom:ulElement});
      extraItems.each( function( lineItem )
      {
        ulElement.insert({bottom:lineItem});
      }.bind(this) );
    }

    // Remove any empty ULs and ensure that the added <ul>s have id of form "cmul${num}_${uniqueId}"
    $A(this.contextMenuDiv.getElementsByTagName("ul")).findAll( function( list )
    {
      if ( list.childElements().length === 0 )
      {
        list.remove(); return false;
      }
      else
      {
        return true;
      }
    }).each( function( list, index )
    {
      list.id = 'cmul'+index+'_'+this.uniqueId;
    }.bind(this) );
  },

  processDynamicMenu : function()
  {
    if (this.dynamicMenu)
    {
      page.ContextMenu.closeAllContextMenus();
      this.generateDynamicMenuHelper(this.afterMenuGeneration, false);
    }
  },

  showContextMenuLink : function()
  {
    page.ContextMenu.showContextMenuLink(this.displayContextMenuLink);
  },

  hideContextMenuLink : function()
  {
    page.ContextMenu.hideContextMenuLink(this.displayContextMenuLink);
  },

  generateDynamicMenu : function(event)
  {
    page.ContextMenu.closeAllContextMenus();
    if (this.dynamicMenu)
    {
      this.generateDynamicMenuHelper(this.afterMenuGeneration, true);
    }
    else
    {
      this.afterMenuGeneration.call(this, null, true);
    }
    $(event).preventDefault();
  },

  generateDynamicMenuHelper : function(callBackOnSuccess, showMenu)
  {
    var context_parameters = this.contextParameters;
    var menu_generator_url = this.menuGeneratorURL;
    var nav = this.nav;
    var overwriteNavItems = this.overwriteNavItems;

    if ( context_parameters )
    {
      context_parameters = context_parameters.toQueryParams();
    }
    else
    {
      context_parameters = {};
    }

    var params = Object.extend({nav_item: nav }, context_parameters );
    params = Object.extend( params, { overwriteNavItems : overwriteNavItems } );

    var dynamicMenusCacheKey = menu_generator_url + JSON.stringify( params );
    if ( undefined !== page.ContextMenu.dynamicMenus.get(dynamicMenusCacheKey) )
    {
      this.afterMenuGeneration.call(this, dynamicMenusCacheKey, showMenu);
    }
    else
    {
      new Ajax.Request(menu_generator_url,
      {
        method: 'post',
        parameters: params,
        onSuccess: callBackOnSuccess.bind( this, dynamicMenusCacheKey, showMenu )
      });
    }
  },

  onDisplayLinkClick: function( event )
  {
    page.ContextMenu.closeAllContextMenus();
    if (this.dynamicMenu)
    {
     this.generateDynamicMenu(event);
    }
    else
    {
      this.showMenu();
      //focus on the first menu item
      (function() { if (this.contextMenuDiv.style.display != 'none') { this.contextMenuDiv.down("a").focus(); } }.bind(this).defer());
      $(event).preventDefault();
    }
  },

  onCloseLinkClick: function( event, doNotSetFocusOnClick )
  {
    this.close();

    var setFocusOnDisplayContextMenuLink = true;

    // grade center (in non-accessible mode) hides displayContextMenuLink onMouseOut, so we need to make sure it's doNotSetFocusOnClose flag is not set
    // before setting focus.
    if ( this.displayContextMenuLink.doNotSetFocusOnClose !== undefined && this.displayContextMenuLink.doNotSetFocusOnClose )
    {
      setFocusOnDisplayContextMenuLink = false;
    }

    // We may not want to set focus on displayContextMenuLink when one of the menu items (other than Close Menu) is clicked.
    // Initially this behavior was required for Grade Center Quick Comment of a grade in the grid (see getGradeContextMenuItems function in gradebookgrid_cellctrl.js)
    if ( doNotSetFocusOnClick !== undefined && doNotSetFocusOnClick )
    {
      setFocusOnDisplayContextMenuLink = false;
    }

    if ( setFocusOnDisplayContextMenuLink )
    {
      this.displayContextMenuLink.focus();
    }
    if (event)
    {
    Event.stop( event );
    }
  },

  close: function()
  {
    // Delay the removal of the element from the page so firefox will continue to process
    // the click on the menu item chosen (otherwise it stops processing as soon as we remove the
    // element resulting in the menu not actually working)
    (function() {
      this.closeNow();
    }.bind(this).delay(0.1));
  },

  closeNow: function()
  {
    if (this.contextMenuDiv.style.display != "none")
    {
      var links = this.contextMenuDiv.getElementsBySelector("li > a");
      links.each(function(link) {
        link.blur();
      });
      this.contextMenuDiv.style.display = "none";
      Element.remove( this.contextMenuDiv );
      if ( this.shim )
      {
        this.shim.close();
      }
    }
  }
};
/**
 * Function called to change the 'arrow' of a breadcrumb to face downward when they are clicked for the
 * contextual menu.
 * @param uniqId - unique number which identifies the crumb which was clicked
 * @param size - the size of the breadcrumb
 * @return
 */
page.ContextMenu.changeArrowInBreadcrumb = function (uniqId, event)
{

  page.ContextMenu.alignArrowsInBreadcrumb(event);
  $('arrowContext_'+uniqId).addClassName('contextArrowDown').removeClassName('contextArrow');
  //Stop the click event to propagate anymore -else all arrows will be aligned again
  Event.stop( event );
  return false;
};

//To align all breadcrumb arrows in one direction
page.ContextMenu.alignArrowsInBreadcrumb = function (event)
{
  if ($('breadcrumbs') !== null){
    var bList = $($('breadcrumbs').getElementsByTagName('ol')[0]);
    var bs = bList.immediateDescendants();
    if (bs.length !== null && bs.length >1){
      for (var i = 2; i <= bs.length; i++) {
        var arrowSpan = $('arrowContext_'+i);
        if (arrowSpan !== null ){
          $('arrowContext_'+i).addClassName('contextArrow').removeClassName('contextArrowDown');
        }
      }
    }
  }

  return false;
};

// "static" methods
page.ContextMenu.LI = function(event, divId, forceMenuRefresh)
{
  page.LazyInit(event,['focus','mouseover'],'new page.ContextMenu(page.util.upToClass(target,\'contextMenuContainer\'), \'' + divId + '\',' + forceMenuRefresh + ');');
};
page.ContextMenu.dynamicMenus = $H()
page.ContextMenu.contextMenus = []; // _Open_ context menus
page.ContextMenu.registerContextMenu = function( menu )
{
  page.ContextMenu.contextMenus.push( menu );
};
page.ContextMenu.hiddenDivs = $H(); // All the menu divs on the page - only needed for cases such as view_spreadsheet2.js where we try to modify the menus outside this framework
page.ContextMenu.hideMenuDiv = function( uniqueId, firstInsideInventoryCard)
{
  var linkId = 'cmlink_' + uniqueId;
  var link = document.getElementById(linkId);
  if (link && !link.savedDiv ) {
    element = page.ContextMenu.locateMenuDiv( link, uniqueId );
    if (element)
    {
      link.savedDiv = element;
      page.ContextMenu.hiddenDivs.set(uniqueId,element);
      Element.remove( element );
      if (firstInsideInventoryCard)
      {
        var theCard = page.util.upToClass(link, 'block');
        if (theCard)
        {
          var menuSpanToMove = page.util.upToClass(link,'contextMenuContainer inlineMenuItems');
          if (menuSpanToMove)
          {
            menuSpanToMove.style.display='inline';
            theCard.insert({bottom:menuSpanToMove});
          }
        }
      }
    }
  }
};
/*
 * This takes in contextMenuDiv or any element inside contextMenuDiv (div element with 'cmdiv_{uniqueId}' as its id) and
 * make necessary changes to show the element in DOM including its container(s) and the link to the context menu.
 */
page.ContextMenu.showContextMenuAndLink = function(elem)
{
  var menuItem;
  var menuGroup;
  var menuDiv;
  if(elem.hasClassName('cmdiv'))
  {
    menuDiv = elem;
    Array.prototype.slice.call(menuDiv.getElementsByTagName('ul')).each(function(menuGroup) {
      menuGroup.removeClassName('cmul-hide');
      Array.prototype.slice.call(menuGroup.getElementsByTagName('li')).each(function(menuItem) {
        $j(menuItem).removeClass('cmli-hide cmitem-hide');
        Array.prototype.slice.call(menuItem.getElementsByTagName('a')).each(function(menuItemLink) {
          menuItemLink.removeClassName('cmitem-hide');
        });
      });
    });
  }
  else
  {
    var elemTagNameUpperCase = elem.tagName.toUpperCase()
    if("UL" === elemTagNameUpperCase)
    {
      menuGroup = elem;
      Array.prototype.slice.call(menuGroup.getElementsByTagName('li')).each(function(menuItem) {
        $j(menuItem).removeClass('cmli-hide cmitem-hide');
        Array.prototype.slice.call(menuItem.getElementsByTagName('a')).each(function(menuItemLink) {
          menuItemLink.removeClassName('cmitem-hide');
        });
      });
    }
    else
    {
      if("A" === elemTagNameUpperCase)
      {
        menuItem = elem.up('li');
        elem.removeClassName('cmitem-hide');
      }
      else if("SPAN" === elemTagNameUpperCase)
      {
        menuItem = elem.up('li');
      }
      else if("LI" === elemTagNameUpperCase)
      {
        menuItem = elem;
        Array.prototype.slice.call(menuItem.getElementsByTagName('a')).each(function(menuItemLink) {
          menuItemLink.removeClassName('cmitem-hide');
        });
      }
      else
      {
        return;
      }
      $j(menuItem).removeClass('cmli-hide cmitem-hide');
      menuGroup = menuItem.up('ul');
    }
    menuGroup.removeClassName('cmul-hide');
    menuDiv = page.util.upToClass(menuGroup,'cmdiv');
  }
  
  var emptyMenuItem = menuDiv.down(".contextmenu_empty");
  if(emptyMenuItem)
  {
    emptyMenuItem.up('ul').remove();
  }
  page.ContextMenu.updateContextMenuLinkVisibility(menuDiv, true)
};
/*
 * This takes in contextMenuDiv or any element inside contextMenuDiv (div element with 'cmdiv_{uniqueId}' as its id) and
 * update the visibility of the (context menu) link that's for the menu
 */
page.ContextMenu.updateContextMenuLinkVisibility = function(elem, isShow)
{
  var ctxMenuLink = page.ContextMenu.locateMenuLink(elem);
  if(ctxMenuLink)
  {
    if(isShow)
    {
      page.ContextMenu.showContextMenuLink(ctxMenuLink);
    }
    else
    {
      page.ContextMenu.hideContextMenuLink(ctxMenuLink);
    }
  }
};
/*
 * This takes in contextMenuDiv or any element inside contextMenuDiv (div element with 'cmdiv_{uniqueId}' as its id) and
 * locate its corresponding context menu link in DOM
 */
page.ContextMenu.locateMenuLink = function(elem)
{
  var ctxMenuDiv;
  if(elem.hasClassName('cmdiv'))
  {
    ctxMenuDiv = elem;
  }
  else
  {
    ctxMenuDiv = page.util.upToClass(elem,'cmdiv');
  }
  var uniqueId = ctxMenuDiv.id.split('_')[1];
  return $('cmlink_'+uniqueId);
};
page.ContextMenu.hideContextMenuLink = function(link)
{
  if( link && page.util.hasClassName(link, 'cmimg') )
  {
    link.addClassName('cmimg-hide');
  }
};
page.ContextMenu.showContextMenuLink = function(link)
{
  if( link && page.util.hasClassName(link, 'cmimg') )
  {
    link.removeClassName('cmimg-hide');
  }
};
page.ContextMenu.locateMenuDiv = function( link, uniqueId )
{
  var elementId = 'cmdiv_' + uniqueId;
  var element = link.nextSibling; // Should be the text between the link and div but check anyways
  if ( !element || element.id != elementId )
  {
    element = element.nextSibling;
    if ( !element || element.id != elementId)
    {
      element = document.getElementById(elementId);
    }
  }
  return element;
};
page.ContextMenu.addDivs = function()
{
  $H(page.ContextMenu.hiddenDivs).values().each(function(ele)
  {
    document.body.appendChild(ele);
  });
};

page.ContextMenu.removeDivs = function()
{
  $H(page.ContextMenu.hiddenDivs).values().each(function(ele)
  {
    Element.remove(ele);
  });
};

page.ContextMenu.closeAllContextMenus = function( event )
{
  var deferClose = false;
  if ( event )
  {
    var e = Event.findElement( event, 'a' );
    if ( e && e.href.indexOf("#contextMenu") >= 0 )
    {
      Event.stop( event );
      return;
    }
    deferClose = true;
  }

  page.ContextMenu.contextMenus.each( function( menu )
  {
    if ( menu != this )
    {
      if (deferClose) {
        menu.close();
      } else {
        menu.closeNow();
      }
    }
  });
  page.ContextMenu.contextMenus = [];
};

/**
 *  Enables flyout menus to be opened using a keyboard or mouse.  Enables
 *  them to be viewed properly in IE as well.
 */
page.FlyoutMenu = Class.create();
page.FlyoutMenu.prototype =
{
  initialize: function( subMenuListItem )
  {
    this.subMenuListItem = $(subMenuListItem);
    this.menuLink = $(subMenuListItem.getElementsByTagName('a')[0]);
    //special case to render iframe shim under new course content build menu
    if (this.subMenuListItem.hasClassName('bcContent'))
    {
      var buildContentDiv = this.subMenuListItem.down("div.flyout");
      if ( !buildContentDiv )
      {
        this.subMenu = $(subMenuListItem.getElementsByTagName('ul')[0]);
      }
      else
      {
        this.subMenu = buildContentDiv;
      }
    }
    else
    {
      this.subMenu = $(subMenuListItem.getElementsByTagName('ul')[0]);
    }
    this.menuLink.flyoutMenu = this;

    // calculate the next/previous tab stops
    this.previousSibling = this.subMenuListItem.previous();
    while ( this.previousSibling && (!this.previousSibling.down('a') || !this.previousSibling.visible()) )
    {
      this.previousSibling = this.previousSibling.previous();
    }
    this.nextSibling = this.subMenuListItem.next();
    while ( this.nextSibling && (!this.nextSibling.down('a') || !this.nextSibling.visible()) )
    {
      this.nextSibling = this.nextSibling.next();
    }

    var rumble = $(this.subMenuListItem.parentNode.parentNode);
    this.inListActionBar = rumble && ( rumble.hasClassName("rumble_top") || rumble.hasClassName("rumble") );

    Event.observe( this.menuLink, 'mouseover', this.onOpen.bindAsEventListener( this ) );
    Event.observe( subMenuListItem, 'mouseout', this.onClose.bindAsEventListener( this ) );
    Event.observe( this.menuLink, 'click', this.onLinkOpen.bindAsEventListener( this ) );
    Event.observe( this.subMenuListItem, 'keydown', this.onKeyPress.bindAsEventListener( this ) );

    $A( this.subMenu.getElementsByTagName('li') ).each ( function( li )
    {
      $A(li.getElementsByTagName('a')).each( function( link )
      {
        Event.observe( link, 'focus', this.onAnchorFocus.bindAsEventListener( this ) );
        Event.observe( link, 'blur', this.onAnchorBlur.bindAsEventListener( this ) );
        Event.observe( link, 'click', this.onLinkClick.bindAsEventListener( this, link ) );
      }.bind( this ) );
    }.bind( this ) );

    // ARIA menus currently don't work properly in IE8, JAWS consumes arrow up/down keys
    this.useARIA = page.util.useARIA() && !Prototype.Browser.IE;
    if ( this.useARIA )
    {
      this.initARIA();
    }
    this.enabled = true;
  },

  initARIA: function()
  {
    var inListActionBar = this.inListActionBar;
    if ( inListActionBar )
    {
      this.subMenuListItem.up('ul').setAttribute( "role", "menubar" );
    }
    this.subMenuListItem.setAttribute( "role", "presentation" );
    this.subMenuListItem.down('a').setAttribute( "role", "menuitem" );
    this.subMenu.setAttribute( "role", "menu" );
    if ( !this.menuLink.hasClassName("notMenuLabel") )
    {
      this.subMenu.setAttribute( "aria-labelledby", this.menuLink.id );
    }
    $A( this.subMenu.getElementsByTagName('a') ).each ( function( link )
    {
      link.setAttribute( "role", "menuitem" );
      link.parentNode.setAttribute( "role", "presentation" );
      // List action bars have onclick handlers that prevent submission of the page
      // if no items are selected, so we can't register new onclicks here because
      // otherwise we can't stop them from executing.
      if ( !inListActionBar )
      {
        if ( !link.href.include("#") )
        {
          Event.observe( link, 'click', function() {
            if ( this.ohref.toLowerCase().startsWith("javascript") )
            {
              eval(decodeURIComponent(this.ohref) );
            }
            else
            {
              if ( this.target )
              {
                window.open( this.ohref, this.target );
              }
              else
              {
                window.location = this.ohref;
              }
            }
          } );
          link.ohref = link.href;
          link.removeAttribute( "href" );
          link.tabIndex = "-1";
          link.style.cursor = 'pointer'; // make it look like a link.
        }
      }
    });

  },

  setEnabled: function( enabled )
  {
    this.enabled = enabled;
    if ( !enabled )
    {
      this.subMenu.setStyle({ display: '' });
    }
  },

  onKeyPress: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    var key = event.keyCode || event.which;
    var elem = Event.element ( event );
    var children, index, link;
    if ( key == Event.KEY_UP )
    {
      children = this.subMenu.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index > 0 )
      {
        children[index - 1].focus();
      }
      else if ( index === 0 )
      {
        children[children.length - 1].focus(); // wrap to bottom
      }
      Event.stop( event );
    }
    else if ( key == Event.KEY_DOWN )
    {
      children = this.subMenu.getElementsBySelector("li > a");
      index = children.indexOf( elem );
      if ( index == -1 )
      {
        this.open();
       (function() { this.subMenu.down("li > a").focus(); }.bind(this).defer());
      }
      else if ( index < ( children.length - 1 ) )
      {
        children[index + 1].focus();
      }
      else if ( index == ( children.length - 1 ) )
      {
        children[0].focus(); // wrap to top
      }

      Event.stop( event );
    }
    else if ( key == Event.KEY_LEFT )
    {
      if ( !this.previousSibling || ( this.previousSibling.hasClassName("mainButton") ||
                                  this.previousSibling.hasClassName("mainButtonType") ) )
      {
        this.executeTab( event, true, true );
      }
      else if ( this.previousSibling )
      {
        link = this.previousSibling.getElementsByTagName('a')[0];
        if ( !link || !this.previousSibling.hasClassName("sub") )
        {
          return;
        }
        this.close();
        page.util.fireClick( link );
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_RIGHT )
    {
      if ( !this.nextSibling || ( this.nextSibling.hasClassName("mainButton") ||
                              this.nextSibling.hasClassName("mainButtonType") ) )
      {
        this.executeTab( event, true, false );
      }
      else if ( this.nextSibling )
      {
        link = this.nextSibling.getElementsByTagName('a')[0];
        if ( !link || !this.nextSibling.hasClassName("sub") )
        {
          return;
        }
        this.close();
        page.util.fireClick( link );
        Event.stop( event );
      }
    }
    else if ( key == Event.KEY_ESC )
    {
      this.close();
      this.menuLink.focus();
      Event.stop( event );
    }
    else if ( key == Event.KEY_RETURN && this.useARIA && !this.inListActionBar )
    {
      page.util.fireClick( elem );
      Event.stop( event );
    }
    else if ( key == Event.KEY_TAB && this.useARIA )
    {
      this.executeTab( event, false, event.shiftKey );
    }
  },

  executeTab: function( event, forceMenuLinkTab, shift )
  {
    var elem = Event.element ( event );
    var link;
    if ( ( elem != this.menuLink ) || forceMenuLinkTab )
    {
      if ( shift )
      {
        // Go to previous menu
        if ( this.previousSibling )
        {
          link = this.previousSibling.getElementsByTagName('a')[0];
          if ( link ) { link.focus(); } else { this.menuLink.focus(); }
        }
        else
        {
          this.menuLink.focus();
        }
      }
      else
      {
        // Go to next menu
        if ( this.nextSibling )
        {
          link = this.nextSibling.getElementsByTagName('a')[0];
          if ( link ) { link.focus(); } else { this.menuLink.focus(); }
        }
        else
        {
          this.menuLink.focus();
        }
      }

      this.close();
      Event.stop( event );
    }
  },

  onOpen: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    this.open();
  },

  onClose: function( event )
  {
    var to = $(event.relatedTarget || event.toElement);
    if ( !to || to.up('li.sub') != this.subMenuListItem )
    {
      this.close();
    }
  },

  onLinkOpen: function( event )
  {
    if (!this.enabled)
    {
      return;
    }
    this.open();
    (function() { this.subMenu.down("li > a").focus(); }.bind(this).defer());
    Event.stop( event );
  },

  resizeAfterShowHide: function()
  {
  // TODO - ideally this would just resize the outer div, but closing and opening 'works'
  this.close();
  this.open();
  },

  open: function()
  {
    var alreadyShown = this.subMenu.getStyle('display') === 'block';
    // If the menu is already showing (i.e. as_ce4 theme, we don't need to position it)
    if ( !alreadyShown )
    {
      // Set position of action bar elements to static to enable z-index stack order
      page.util.setActionBarPosition( 'static' );

      var menuTop = this.subMenuListItem.getHeight();
      if ( this.subMenu.hasClassName( 'narrow' ) )
      {
        menuTop = 0;
      }
      this.subMenuListItem.setStyle( {position: 'relative'} );
      this.subMenu.setStyle(
      {
        display: 'block',
        zIndex: '999999',
        top: menuTop+'px',
        left: '0px',
        width: '',
        height: '',
        overflowY: ''
      });
      var offset = Position.cumulativeOffset( this.subMenuListItem );
      var menuDims = this.subMenu.getDimensionsEx();
      var menuHeight = menuDims.height;
      var popupWidth = this.subMenu.getWidth();
      var subListItemDims = this.subMenuListItem.getDimensions();
      var menuWidth = subListItemDims.width;

      var viewportDimensions = document.viewport.getDimensions();
      var scrollOffsets = document.viewport.getScrollOffsets();
      var gnav = $('globalNavPageNavArea');
      var gnavHeight = 0;
      if (window.self === window.top) {
        if (gnav)
        {
          var gdim = gnav.getDimensions()
          gnavHeight = gdim.height;
        }
        viewportDimensions.height -= gnavHeight;
        var gnavContent = $('globalNavPageContentArea');
        var gnavScroll = 0;

        if (gnavContent)
        {
          gnavScroll = gnavContent.scrollTop;
        }
        scrollOffsets.top += gnavScroll;

        var offsetTop = offset[1] - scrollOffsets.top - gnavHeight;
      }
      this.subMenu.flyoutMenu = this;

      if ( (offsetTop + menuHeight + subListItemDims.height) > viewportDimensions.height)
      {
        if ( (offsetTop - menuHeight) > 0 )
        {
          // if menu goes below viewport but still fits on-page, show it above button
          this.subMenu.setStyle({ top: '-'+menuHeight+'px' });
        }
        else
        {
          // we need to create scrollbars
          var newWidth = this.subMenu.getWidth() + 15;
          popupWidth = newWidth + 5;
          var newMenuHeight = viewportDimensions.height - (offsetTop + subListItemDims.height) - 20;
          var newMenuTop = menuTop;
          if (newMenuHeight < offsetTop)
          {
            // More space above than below
            newMenuHeight = offsetTop;
            newMenuTop = -offsetTop;
          }
          this.subMenu.setStyle(
                                {
                                  display: 'block',
                                  zIndex: '999999',
                                  top: newMenuTop+'px',
                                  left: '0px',
                                  width: newWidth + 'px',
                                  height: newMenuHeight + 'px',
                                  overflowY: 'auto'
                                });
        }
      }

      var offsetLeft = offset[0] - scrollOffsets.left;
      if ( (offsetLeft + popupWidth) > viewportDimensions.width )
      {
        var subMenuWidth = this.subMenuListItem.getWidth();
        var newLeft = popupWidth - (viewportDimensions.width-offsetLeft);
        if ((newLeft > 0) && (newLeft < offsetLeft))
        {
          newLeft = -newLeft;
        }
        else
        {
          newLeft = -offsetLeft;
        }
        this.subMenu.setStyle({ left: newLeft+'px' });
      }

      if ( page.util.isRTL() )
      {
        var newRight = 0;
        if ( (offsetLeft + menuWidth) - popupWidth < 0 )
        {
          newRight = (offsetLeft + menuWidth) - popupWidth;
        }
        this.subMenu.setStyle({ left: '', right: newRight+'px'});
      }

      if (!this.shim)
      {
        this.shim = new page.popupShim( this.subMenu);
      }

      this.shim.open();
    }
  },

  close: function()
  {
    // Reset position of action bar elements to relative
    page.util.setActionBarPosition( 'relative' );

    this.subMenuListItem.setStyle({position: ''});
    this.subMenu.setStyle({
      display: '',
      top: '',
      left: '',
      width: '',
      height: '',
      overflowY: ''
    });
    if ( this.shim )
    {
      this.shim.close();
    }
  },

  onLinkClick: function( event, link )
  {
    if (!this.enabled)
    {
      return;
    }
    setTimeout( this.blurLink.bind( this, link), 100);
  },

  blurLink: function( link )
  {
    link.blur();
    if (page.util.hasClassName( link, "donotclose" ))
    {
      link.focus();
    }
    else
    {
      this.close();
    }

  },

  onAnchorFocus: function ( event )
  {
    if (!this.enabled)
    {
      return;
    }
    var link = Event.element( event );
    link.setStyle({ backgroundColor: '#FFFFFF' });
  },

  onAnchorBlur: function( event )
  {
    var link = Event.element( event );
    link.setStyle({ backgroundColor: '' });
  }
};

/**
 * Class for providing functionality to menu palettes
 */
page.PaletteController = Class.create();
page.PaletteController.prototype =
{
  /**
   * Constructor
   *
   * @param paletteIdStr        Unique string identifier for a palette
   * @param expandCollapseIdStr Id value of anchor tag to be assigned
   *                            the palette expand/collapse functionality
   * @param closeOtherPalettesWhenOpen Whether to close all other palettes when this one is open
   */
  initialize: function( paletteIdStr, expandCollapseIdStr, closeOtherPalettesWhenOpen, collapsed )
  {
    // palette id string
    this.paletteItemStr = paletteIdStr;

    // palette element
    this.paletteItem = $(this.paletteItemStr);

    // default id string to palette contents container element
    this.defaultContentsContainerId = page.PaletteController.getDefaultContentsContainerId(this.paletteItemStr);

    // the currently active palette contents container element
    this.activeContentsContainer = $(this.defaultContentsContainerId);

    // expand/collapse palette toggle element
    this.paletteToggle = $(expandCollapseIdStr);

    if (this.paletteToggle)
    {
      Event.observe(this.paletteToggle, 'click', this.toggleExpandCollapsePalette.bindAsEventListener(this));
    }

    this.closeOtherPalettesWhenOpen = closeOtherPalettesWhenOpen;

    page.PaletteController.registerPaletteBox(this);
    if (collapsed)
    {
      this.collapsePalette(true);
    }
  },

  /**
   * Set the currently active palette contents container element
   *
   * @param container palette contents container element
   */
  setActiveContentsContainer: function ( container )
  {
    this.activeContentsContainer = container;
  },

  /**
   * Get the currently active palette contents container element
   *
   * @return palette contents container element
   */
  getActiveContentsContainer: function ()
  {
    return this.activeContentsContainer;
  },

  /**
   * Expands the palette if it's not already expanded.
   *
   * @return palette contents container element
   */
  expandPalette: function ( doNotPersist )
  {
    var itemPalClass = [];
    itemPalClass = this.paletteItem.className.split(" ");

    var h2 = $(this.paletteItemStr+"_paletteTitleHeading");
    var expandCollapseLink = h2.getElementsByTagName('a')[0];
    if ( !this.useFirstTagForExpandCollapse( h2 ) )
    {
      expandCollapseLink = h2.getElementsByTagName('a')[1];
    }

    var itemList = this.activeContentsContainer;

    if ( itemList.style.display == "none" )
    {
      itemList.style.display = "block";
      itemPalClass.length = itemPalClass.length - 1;
      this.paletteItem.className = itemPalClass.join(" ");
      h2.className = "";
      var itemTitle = expandCollapseLink.innerHTML.stripTags().trim();
      if ( !this.useFirstTagForExpandCollapse( h2 ) )
      {
        itemTitle = h2.getElementsByTagName('a')[0].innerHTML.stripTags();
      }
      expandCollapseLink.title = page.bundle.getString('expandCollapse.collapse.section.param', itemTitle);
      expandCollapseLink.up().setAttribute("aria-expanded", "true");
    }

    if ( doNotPersist )
    {
      return;
    }

    this.saveSessionStickyInfo( itemList.id, itemList.style.display );
  },

  /**
   * Collapses the palette if it's not already collapsed.
   *
   * @return palette contents container element
   */
  collapsePalette: function ( doNotPersist )
  {
    var itemPalClass = [];
    itemPalClass = this.paletteItem.className.split(" ");

    // Note - h2 is actually a div, not an h2 :)
    var h2 = $(this.paletteItemStr+"_paletteTitleHeading");
    var expandCollapseLink = h2.getElementsByTagName('a')[0];
    if ( !this.useFirstTagForExpandCollapse( h2 ) )
    {
      expandCollapseLink = h2.getElementsByTagName('a')[1];
    }

    var itemList = this.activeContentsContainer;

    if ( itemList.style.display != "none" )
    {
      itemList.style.display = "none";
      itemPalClass[itemPalClass.length] = 'navPaletteCol';
      this.paletteItem.className = itemPalClass.join(" ");

      if (itemPalClass.indexOf('controlpanel') != -1)
      {
      }

      if (itemPalClass.indexOf('listCm')!=-1)
      {
        h2.className = "listCmCol"; // colors h2 background (removes background image)
      }

      if (itemPalClass.indexOf('tools') != -1)
      {
        h2.className = "toolsCol";
      }
      var itemTitle = expandCollapseLink.innerHTML.stripTags();
      if ( !this.useFirstTagForExpandCollapse( h2 ) )
      {
        itemTitle = h2.getElementsByTagName('a')[0].innerHTML.stripTags().trim();
      }
      expandCollapseLink.title = page.bundle.getString('expandCollapse.expand.section.param', itemTitle);
      expandCollapseLink.up().setAttribute("aria-expanded", "false");
    }

    if (doNotPersist)
    {
      return;
    }

    this.saveSessionStickyInfo( itemList.id, itemList.style.display );
  },

  /**
   * Takes in a key value pair to save to the session as sticky data.
   *
   * @param key The key that will have the current course id appended to it to be saved to the session.
   * @param value The value to the key.
   */
  saveSessionStickyInfo: function( key, value )
  {
    /* Get the course id off of the global variable if exists, so that data is saved per
     * user session per course. If course doesn't exist, use empty string.
     */
    var current_course_id = window.course_id ? window.course_id : "";
    UserDataDWRFacade.setStringTempScope( key + current_course_id, value );
  },

  /**
   * Whether the first tag has js onclick event binding on it for palette collapse/expand
   *
   * @param h2
   */
  useFirstTagForExpandCollapse: function ( h2 )
  {
    return h2.getElementsByTagName('a')[0].id.indexOf( "noneExpandCollapseTag" ) > -1 ? false : true;
  },

  /**
   * Toggles a palette from expand to collapse and vice versa.
   *
   * @param event Optional event object if this method was bound to event.
   */
  toggleExpandCollapsePalette: function ( event, doNotPersist )
  {
    // To prevent default event behavior
    if ( event )
    {
      Event.stop( event );
    }

    if ( this.activeContentsContainer.style.display == "none" )
    {
      // palette is currently closed, so we will be expanding it
      if ( this.closeOtherPalettesWhenOpen )
      {
        // if closeOtherPalettesWhenOpen is set to true for this palette, close all other palettes
        page.PaletteController.closeAllOtherPalettes(this.paletteItemStr, doNotPersist);
      }
      this.expandPalette( doNotPersist );
    }
    else
    {
      // palette is currently expanded, so we will be collapsing it
      this.collapsePalette( doNotPersist );
    }
  }
};

// "static" methods

page.PaletteController.paletteBoxes = [];
page.PaletteController.registerPaletteBox = function( paletteBox )
{
  page.PaletteController.paletteBoxes.push( paletteBox );
};

/**
 * Get the palette controller js object by palette id
 *
 * @param paletteId
 */
page.PaletteController.getPaletteControllerObjById = function( paletteId )
{
  return page.PaletteController.paletteBoxes.find( function( pb )
         { return ( pb.paletteItemStr == paletteId ); } );
};


/**
 * Closes all palettes except the specified one
 *
 * @param paletteToKeepOpen
 */
page.PaletteController.closeAllOtherPalettes = function( paletteToKeepOpen, doNotPersist )
{
  for(var i = 0; i < page.PaletteController.paletteBoxes.length; i++)
  {
    var paletteItem = page.PaletteController.paletteBoxes[i];
    if (paletteToKeepOpen !== paletteItem.paletteItemStr)
    {
      paletteItem.collapsePalette( doNotPersist );
    }
  }
};

/**
 * Toggles (expand/collapse) the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.toggleExpandCollapsePalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.toggleExpandCollapsePalette( null, doNotPersist);
};


/**
 * Collapses the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.collapsePalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.collapsePalette( doNotPersist);
};


/**
 * Expand the contents of a nav palette by palette id
 *
 * @param paletteId
 * @param doNotPersist - optional param to suppress persisting state, default is to persist
 */
page.PaletteController.expandPalette = function( paletteId, doNotPersist )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  paletteObj.expandPalette( doNotPersist);
};


/**
 * Set the active palette contents container (element containing the body
 * contents of a palette). The active contents container is used to toggle
 * visibility when expanding and collapsing menu palettes.
 *
 * @param paletteId
 * @param paletteContentsContainer Optional container to set.
 *                                 If not given, the palette's active
 *                                 container will not be changed.
 * @return The new active palette contents container element.
 *         If no paletteContentsContainer element was passed,
 *         The current active palette contents container element
 *         will be returned.
 */
page.PaletteController.setActivePaletteContentsContainer = function( paletteId, paletteContentsContainer )
{
  var paletteObj = page.PaletteController.getPaletteControllerObjById( paletteId );
  if ( paletteContentsContainer )
  {
    paletteObj.setActiveContentsContainer( paletteContentsContainer );
  }
  return paletteObj.getActiveContentsContainer();
};

/*
 * Get the default palette contents container id string
 *
 * @param paletteId
 */
page.PaletteController.getDefaultContentsContainerId = function( paletteId )
{
  return paletteId + "_contents";
};


/**
 * Class for providing expand/collapse functionality (with dynamic loading)
 */
page.ItemExpander = Class.create();
page.ItemExpander.prototype =
{
  /**
   * Constructor
   * - expandLink - the link that when clicked will expand/collapse the item
   * - expandArea - the actual area that will get expanded/collapsed (if the item is dynamically loaded, this area will be populated dynamically)
   * - expandText - the text to show as a tooltip on the link for expanding
   * - collapseText - the text to show as a tooltip on the link for collapsing
   * - expandTitleText - the customized text for link title afer expanding the item; if null/undefined, use expandText
   * - collapseTitleText - the customized text for link title after collapsing the item;if null/undefined, use collapseText
   * - dynamic - whether the contents are dynamically loaded
   * - dynamicUrl - the URL to get the contents of the item from
   * - contextParameters - additional URL parameters to add when calling the dynamicUrl
   * - sticky - load/save expand state from UserData; true if null/undefined
   * - expanded - initially expanded; false if null/undefined
   */
  initialize: function( expandLink, expandArea, expandText, collapseText, dynamic, dynamicUrl, contextParameters, expandTitleText, collapseTitleText, sticky, expanded )
  {
    this.expandLink = $(expandLink);
    this.expandArea = $s(expandArea);
    // Register the expander so it can be found
    page.ItemExpander.itemExpanderMap[this.expandLink.id] = this;
    this.expandText = expandText.unescapeHTML();
    this.collapseText = collapseText.unescapeHTML();
    if ( expandTitleText !== null && expandTitleText !== undefined )
    {
      this.expandTitleText = expandTitleText.unescapeHTML();
    }
    else
    {
      this.expandTitleText = this.expandText;
    }
    if ( collapseTitleText !== null && collapseTitleText !== undefined )
    {
      this.collapseTitleText = collapseTitleText.unescapeHTML();
    }
    else
    {
      this.collapseTitleText = this.collapseText;
    }
    this.dynamic = dynamic;
    this.dynamicUrl = dynamicUrl;

    if ( contextParameters !== null && contextParameters !== undefined )
    {
      this.contextParameters = contextParameters.toQueryParams();
    }
    else
    {
      this.contextParameters = {};
    }

    this.sticky = ( sticky !== null && sticky !== undefined ) ? sticky : true;
    this.expanded = ( expanded !== null && expanded !== undefined ) ? expanded : false;
    this.hasContents = !this.dynamic;

    if ( this.sticky )
    {
      // get the course id off of the global variable if exists, because data is saved per user session per course
      var current_course_id = ( (typeof course_id != "undefined") && course_id !== null ) ? course_id : "";
      UserDataDWRFacade.getStringTempScope( this.expandLink.id + current_course_id, this.getAvailableResponse.bind( this ) );
    }
    this.expandCollapse( !this.expanded );
    Event.observe( this.expandLink, "click", this.onToggleClick.bindAsEventListener( this ) );
  },

  getAvailableResponse : function ( response  )
  {
    var originalExpanded = this.expanded ;
    var cachedExpanded = false;
    if ( response.length > 0 )
    {
      if ( response == 'true' )
      {
        cachedExpanded = true;
      }
      else
      {
        cachedExpanded = false;
    }
    }

    if ( originalExpanded != cachedExpanded )
    {
      //because we want the menu to be in the cached state,
      //we pass in the opposite so that expandCollapse changes the menu state.
      this.expandCollapse(originalExpanded);
    }
  },

  onToggleClick: function( event )
  {
    if ( event )
    {
      Event.stop( event );
    }

    this.expandCollapse(this.expanded);

    if ( this.sticky )
    {
      // get the course id off of the global variable if exists, so that data is saved per user session per course
      var current_course_id = ( (typeof course_id != "undefined") && course_id !== null ) ? course_id : "";
      UserDataDWRFacade.setStringTempScope( this.expandLink.id + current_course_id, this.expanded );
    }
  },

  expandCollapse: function(shouldCollapse)
  {
    var combo;
    if ( shouldCollapse ) //Collapse the item
    {
      $(this.expandArea).hide();
      this.expandLink.title = this.expandTitleText;
      this.expandLink.up().setAttribute("aria-expanded", "false");
      if ( this.expandLink.hasClassName("comboLink_active") )
      {
        combo = this.expandLink.up("li").down(".submenuLink_active");
        this.expandLink.removeClassName("comboLink_active");
        this.expandLink.addClassName("comboLink");
        if ( combo )
        {
          combo.removeClassName("submenuLink_active");
          combo.addClassName("submenuLink");
        }
      }
      else
      {
        this.expandLink.removeClassName("open");
      }
      this.expanded = false;
    }
    else //Expand the item
    {
      if ( this.hasContents )
      {
        $(this.expandArea).setStyle({ zoom: 1 });
        this.expandArea.show();
        this.expandLink.title = this.collapseTitleText;
        this.expandLink.up().setAttribute("aria-expanded", "true");
        if ( this.expandLink.hasClassName("comboLink") )
        {
          combo = this.expandLink.up("li").down(".submenuLink");
          this.expandLink.removeClassName("comboLink");
          this.expandLink.addClassName("comboLink_active");
          if ( combo )
          {
            combo.removeClassName("submenuLink");
            combo.addClassName("submenuLink_active");
          }
        }
        else
        {
          this.expandLink.addClassName("open");
        }
      }
      else if ( this.dynamic )
      {
        this.loadData();
      }

      this.expanded = true;
    }
  },

  loadData: function()
  {
    new Ajax.Request( this.dynamicUrl,
    {
      method: "post",
      parameters: this.contextParameters,
      requestHeaders: { cookie: document.cookie },
      onSuccess: this.afterLoadData.bind( this )
    });
  },

  afterLoadData: function( req )
  {
    try
    {
      var result = req.responseText.evalJSON( true );
      if ( result.success != "true" )
      {
        new page.InlineConfirmation("error", result.errorMessage, false );
      }
      else
      {
        this.hasContents = true;
        this.expandArea.innerHTML = result.itemContents;
        $(this.expandArea).setStyle({ zoom: 1 });
        this.expandArea.show();
        this.expandLink.title = this.collapseTitleText;
        this.expandLink.up().setAttribute("aria-expanded", "true");
        if ( this.expandLink.hasClassName("comboLink") )
        {
          var combo = this.expandLink.up("li").down(".submenuLink");
          this.expandLink.removeClassName("comboLink");
          this.expandLink.addClassName("comboLink_active");
          if ( combo )
          {
            combo.removeClassName("submenuLink");
            combo.addClassName("submenuLink_active");
          }
        }
        else
        {
          this.expandLink.addClassName("open");
        }
        this.expanded = true;
      }
    }
    catch ( e )
    {
      //Invalid response
    }
  }
};
page.ItemExpander.itemExpanderMap = {};

/**
 * Class for controlling the "breadcrumb expansion" (i.e. the "..." hiding the inner
 * breadcrumbs)
 */
page.BreadcrumbExpander = Class.create();
page.BreadcrumbExpander.prototype =
{
  initialize: function( breadcrumbBar )
  {
    var breadcrumbListElement = $(breadcrumbBar.getElementsByTagName('ol')[0]);
    var breadcrumbs = breadcrumbListElement.immediateDescendants();
    if ( breadcrumbs.length > 4 )
    {
      this.ellipsis = document.createElement("li");
      var ellipsisLink = document.createElement("a");
      ellipsisLink.setAttribute("href", "#");
      ellipsisLink.setAttribute("title", page.bundle.getString('breadcrumbs.expand') );
      ellipsisLink.innerHTML = "...";
      this.ellipsis.appendChild( ellipsisLink );
      this.ellipsis = Element.extend( this.ellipsis );
      Event.observe( ellipsisLink, "click", this.onEllipsisClick.bindAsEventListener( this ) );
      this.hiddenItems = $A(breadcrumbs.slice(2,breadcrumbs.length - 2));
      breadcrumbListElement.insertBefore( this.ellipsis, this.hiddenItems[0] );
      this.hiddenItems.invoke( "hide" );
    }

    // Make sure the breadcrumbs don't run into the mode switcher
    var breadcrumbContainer = $(breadcrumbListElement.parentNode);
    var modeSwitcher = breadcrumbBar.down('.modeSwitchWrap');
    if ( modeSwitcher )
    {
      var containerWidth = breadcrumbContainer.getWidth();
      var containerOffset = breadcrumbContainer.cumulativeOffset();
      var modeSwitcherOffset = modeSwitcher.cumulativeOffset();
      var modeSwitcherWidth = modeSwitcher.getWidth();
      if ( page.util.isRTL() )
      {
        if ( modeSwitcherOffset[0] + modeSwitcherWidth > containerOffset[0] )
        {
          breadcrumbContainer.setStyle({ paddingLeft: ( modeSwitcherOffset[0] + modeSwitcherWidth ) + 'px'} );
        }
      }
     // else
      //{
       // breadcrumbContainer.setStyle({ paddingRight: ( containerWidth - ( modeSwitcherOffset[0] - containerOffset[0] ) ) + 'px'} );
      //}
    }
  },

  onEllipsisClick: function( event )
  {
    this.hiddenItems.invoke( "show" );
    this.ellipsis.hide();
    Event.stop( event );
  }
};

/**
 * Dynamically creates an inline confirmation.
 *
 * refreshMessage - if we allow only one receipt on the page, refresh the message; even if we display only one instance of message on the page, we can change the content of the message
 */
page.InlineConfirmation = Class.create();
page.InlineConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, oneReceiptPerPage, refreshMessage, focusOnRender )
  {
    if ( Object.isUndefined( focusOnRender ) )
    {
      focusOnRender = true;
    }
    var receiptId = $s('receipt_id');
    // do not insert a duplicate receipt, if one already exists
    if( receiptId && oneReceiptPerPage )
    {
      if( !refreshMessage )
      {
        return;
      }
      else
      {
        var receiptDivElement = $( receiptId );
        receiptDivElement.parentNode.removeChild( receiptDivElement );
      }
    }
    var cssClass = "bad";
    if ( type == "success" )
    {
      cssClass = "good";
    }
    else if ( type == "warning" )
    {
      cssClass = "warningReceipt";
    }
    var contentPane = $('contentPanel') || $('portalPane');
    var receiptHtml = '<div id="receipt_id" class="receipt '+ cssClass +'">'+
                      '<span class="inlineReceiptSpan" tabindex="-1">'+message+'</span>';
    if ( showRefreshLink )
    {
      receiptHtml += ' <a href="#refresh" onClick="document.location.href = document.location.href; return false;">' + page.bundle.getString("inlineconfirmation.refresh") + '</a>';
    }
    receiptHtml += '<a class="close" href="#close" title="'+ page.bundle.getString("inlineconfirmation.close") +'" onClick="Element.remove( $(this).up(\'div.receipt\') ); return false;"><img alt="'+ page.bundle.getString("inlineconfirmation.close") +'" src="' + getCdnURL( "/images/ci/ng/close_mini.gif" ) + '"></a></div>';
    contentPane.insert({top:receiptHtml});
    // use aria live region to announce this confirmation message rather than setting focus to it. (Too many things are fighting over setting focus)
    // Note: if this confirmation is invoked from a menu handler, it may not announce if focus is lost when the menu closes. See how courseTheme.js sets focus before invoking.
    var insertedA = contentPane.down('span.inlineReceiptSpan');
    insertedA.setAttribute("aria-live","assertive");
    insertedA.parentNode.setAttribute("role","application");
    (function() { insertedA.update( insertedA.innerHTML ); }.defer(2));  // update live region so it is announced

    if( focusOnRender )
    {
      page.util.focusAndScroll( insertedA );
    }
  }
};

page.NestedInlineConfirmationIdCounter = 0;
page.NestedInlineConfirmation = Class.create();
page.NestedInlineConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, previousElement,showCloseLink, extracss, insertBefore, oneReceiptPerPage, fadeAway, focusDiv, fadingTime, insertTop, receiptDivId, focusOnRender, additionalArrowCss )
  {
    new page.NestedInlineConfirmationEx({
      type : type,
      message : message,
      showRefreshLink : showRefreshLink,
      previousElement : previousElement,
      showCloseLink : showCloseLink,
      extracss : (extracss) ? extracss : "",
      insertBefore : insertBefore,
      oneReceiptPerPage : oneReceiptPerPage,
      fadeAway : fadeAway,
      focusDiv : focusDiv,
      fadingTime : fadingTime,
      insertTop : insertTop,
      receiptDivId : receiptDivId,
      focusOnRender : focusOnRender,
      additionalArrowCss : additionalArrowCss});
  }
};

page.NestedInlineConfirmationEx = Class.create();
page.NestedInlineConfirmationEx.prototype =
{
  initialize: function( options )
  {
    this.options = Object.extend(
                                 {
                                     type : null,
                                     message : null,
                                     showRefreshLink : null,
                                     previousElement: null,
                                     showCloseLink : null,
                                     extracss: "",
                                     insertBefore: null,
                                     oneReceiptPerPage: null,
                                     fadeAway : null,
                                     focusDiv : null,
                                     fadingTime: null,
                                     insertTop: null,
                                     receiptDivId : null,
                                     focusOnRender : true,
                                     axOnly : false,
                                     additionalArrowCss: ""
                                 }, options );

   var receiptId = $s('receipt_nested_id');
    // do not insert a duplicate receipt, if one already exists
   var newDivId = 'receipt_nested_id';
    if(receiptId)
    {
      if (this.options.oneReceiptPerPage)
      {
        return;
      }
      newDivId = newDivId + (page.NestedInlineConfirmationIdCounter++);
    }

    // if receiptDivId is provided, we are explicitly using it as the id for the new receipt replacing the existing receipt with the same id
    if (this.options.receiptDivId)
    {
      // Remove the old message with the same receiptDivId if there is one before adding a new one
      if ( $( this.options.receiptDivId ) != null )
      {
        $( this.options.receiptDivId ).remove();
      }
      newDivId = this.options.receiptDivId;
    }

    var cssClass = "bad";
    if ( this.options.type == "success" )
    {
      cssClass = "good";
    }
    else if (this.options.type == "warning")
    {
      cssClass = "warningReceipt";
    }

    if ( this.options.axOnly )
    {
      cssClass = cssClass + ' hideoff';

      //overrides a few options explicitly for our purpose of using the receipt only for AX
      this.options.fadeAway = true;
      this.options.showCloseLink = false;
    }

    var arrowSpan = '';
    if (this.options.extracss.indexOf( "point", 0 ) != -1)
    {
      if ( this.options.additionalArrowCss )
      {
        arrowSpan = '<span class="arrow" style="' +  this.options.additionalArrowCss + '"></span>';
      } else {
        arrowSpan = '<span class="arrow"></span>';
      }
    }

    var contentPane = $(this.options.previousElement);
    if (!contentPane)
    {
      // TODO - if we can't find the element we wanted to insert before, is it OK to just drop the notification?
      return;
    }

    var receiptHtml = '<div id="'+newDivId+'" style="display:none" class="receipt '+ cssClass +' '+this.options.extracss +'">'+arrowSpan+
                      '<span class="inlineReceiptSpan areceipt" tabindex="-1">'+this.options.message+'</span>';
    if ( this.options.showRefreshLink )
    {
      receiptHtml += ' <a href="#refresh" onClick="document.location.href = document.location.href; return false;">' + page.bundle.getString("inlineconfirmation.refresh") + '</a>';
    }

    if (this.options.showCloseLink)
    {
      // either this is a JS Snippet to execute on close or a simple true in which case we do nothing extra
      var onCloseFunction = "";
      if ( typeof this.options.showCloseLink === "string" || this.options.showCloseLink instanceof String )
      {
        if ( !page.closeReceiptLinkCounter )
        {
          page.closeReceiptLinkCounter = 0;
        }
        else
        {
          ++page.closeReceiptLinkCounter;
        }
        onCloseFunction = "onReceiptClosed" + page.closeReceiptLinkCounter;
        receiptHtml += "<script type='text/javascript'>window." + onCloseFunction + " = function( ) { " + this.options.showCloseLink + " ; }; </script>";
        onCloseFunction += "( );";
      }
      receiptHtml += '<a class="close" href="#close" style="z-index:1000" title="' + page.bundle.getString("inlineconfirmation.close") + '" onClick="' + onCloseFunction + 'Element.remove( $(this).up(\'div.receipt\') ); return false;"><img alt="' + page.bundle.getString("inlineconfirmation.close") + '" src="' + getCdnURL( "/images/ci/ng/close_mini.gif" ) + '"></a></div>';
    }

    if ( this.options.insertBefore )
    {
      contentPane.insert({before:receiptHtml});
    }
    else if (this.options.insertTop)
    {
      contentPane.insert({top:receiptHtml});
    }
    else
    {
      contentPane.insert({after:receiptHtml});
    }
    this.insertedDiv = this.options.insertBefore?contentPane.previousSibling:(this.options.insertTop?contentPane.firstChild:contentPane.nextSibling);
    $(this.insertedDiv).show();
    var insertedA = $(this.insertedDiv).down('span.inlineReceiptSpan');
    var fadingDuration = this.options.fadingTime ? this.options.fadingTime : 5000;

    // For all cases (focus or not), set the aria assertive attribute to make sure this is announced by the screen reader
    insertedA.setAttribute("aria-live","assertive");
    this.insertedDiv.setAttribute("role","application");
    (function() { insertedA.update( insertedA.innerHTML ); }.defer(2));  // update live region so it is announced (needed for jaws 12)

    if ( this.options.focusOnRender )
    {
        try
        {
         ( function()
            {
           try
           {
              if ( this.options.focusDiv )
              {
                page.util.focusAndScroll( $( this.options.focusDiv ) );
              }
              else
              {
                page.util.focusAndScroll( insertedA );
              }
           }
           catch ( focusError )
           {
             // Ignore focus errors. These can happens sometimes on IE if focus is set on an element that is located
             // inside another element that has recently been switched from a hidden state to a visible one.
           }

            }.defer() );
        }
        catch ( focusError )
        {
          // Ignore focus errors. These can happens sometimes on IE if focus is set on an element that is located
          // inside another element that has recently been switched from a hidden state to a visible one.
        }
    }
    else
    {
        // not setting focus to this confirmation - but still make sure it is visible.
        if ( this.options.focusDiv )
        {
          page.util.ensureVisible( $( this.options.focusDiv ) );
        }
        else
        {
          page.util.ensureVisible( insertedA );
        }
    }
    if ( this.options.fadeAway )
    {
      setTimeout( function()
      {
        Element.fade( $(this.insertedDiv),
        {
          duration : 0.3
        } );
      }.bind(this), fadingDuration );
    }
  },

  close: function()
  {
    if ( this.insertedDiv )
    {
      this.insertedDiv.remove();
    }
  }
};


page.NestedInlineFadeAwayConfirmation = Class.create();
page.NestedInlineFadeAwayConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, element,showCloseLink, insertBefore, time  )
  {
    var fadingDuration = time ? time : 2000;
    new page.NestedInlineConfirmation(type, message, showRefreshLink, element,showCloseLink, "", insertBefore, null, true, null, fadingDuration );
  }
};

page.NestedInlineFadeAwaySingleConfirmation = Class.create();
page.NestedInlineFadeAwaySingleConfirmation.prototype =
{
  initialize: function( type, message, showRefreshLink, element,showCloseLink, insertBefore, time, newDivId, insertTop )
  {
    var fadingDuration = time ? time : 2000;
    new page.NestedInlineConfirmation(type, message, showRefreshLink, element,showCloseLink, "", insertBefore, false /*only one instance*/, true, null, fadingDuration, insertTop, newDivId );
  }
};

/**
 * Make sure the container as position: relative so that the offset can work
 */
page.MiniReceipt = Class.create();
page.MiniReceipt.prototype =
{
    initialize: function( message, containerElement, top, left, time )
    {
      var visibleDuration = time ? time : 2000;
      var top = top?top:-22; // usually show receipt above
      var left = left?left:0;
      var alreadyExistingReceipt = $( containerElement ).down( "div.miniReceipt" );
      if  ( alreadyExistingReceipt )
      {
        alreadyExistingReceipt.hide( );
      }
      var receiptHtml = '<div class="miniReceipt adding" style="display: none; top:' + top + 'px; left:'+ left + 'px" role="alert" aria-live="assertive">' + message + '</div>';
      var receiptElement = $( containerElement ).insert( { top:receiptHtml } ).firstDescendant( );
      $( containerElement ).select();
      receiptElement.show( );
      setTimeout(
        function()
        {
          Element.fade( receiptElement, {duration:0.3, afterFinish: function() { receiptElement.remove(); } } );
        }, visibleDuration );
    }
};

page.extendedHelp = function( helpattributes, windowName )
{
  window.helpwin = window.open('/webapps/blackboard/execute/viewExtendedHelp?' +
               helpattributes,windowName,'menubar=1,resizable=1,scrollbars=1,status=1,width=480,height=600');
  window.helpwin.focus();
};

page.decoratePageBanner = function()
{
  var bannerDiv = $('pageBanner');
  // TODO: review this logic - we used to actually add a style to containerDiv but
  // we do not need it anymore - does the pagetitlediv hiding depend on containerdiv existing?  probably, so leaving
  var containerDiv = $('contentPanel') || $('contentPane');
  if ( bannerDiv && containerDiv )
  {
    // hide empty title bar
    if ( !$('pageTitleText') && $('pageTitleDiv') )
    {
      $('pageTitleDiv').hide();
    }
  }
};

page.initializeSinglePopupPage = function( pageId )
{
  // Initialize the single popup page, make sure the window will be closed by clicking submit or cancel, and the parent
  // window will be refreshed after submit.
  var items = document.forms;
  for ( var i = 0; i < items.length; i++ )
  {
    var formItem = items[ i ];
    formItem.observe( 'submit', function()
    {
       (function()
       {
         window.close();
         if( window.opener.refreshConfirm )
         {
            window.opener.refreshConfirm(pageId);
         }
       }.defer());
    } );
    //TODO: Delete the reference to top_Cancel after floating bottom submit proven works.
    if ( formItem.top_Cancel )
    {
      Event.observe( formItem.top_Cancel, 'click', function( event )
      {
        Event.stop( event );
        window.close();
      } );
    }
    if ( formItem.bottom_Cancel )
    {

      Event.observe( formItem.bottom_Cancel, 'click', function( event )
      {
        Event.stop( event );
        window.close();
      } );
    }
  }
};

page.openLightbox = function( link, title, url, width, height )
{
  var lightboxParam =
  {
      defaultDimensions :
      {
          w : width ? width : 1000,
          h : height ? height : 800
      },
      contents : '<iframe src="' + url + '" width="100%" height="100%"/>',
      title : title,
      closeOnBodyClick : false,
      showCloseLink : true,
      useDefaultDimensionsAsMinimumSize : true
  };
  var lightboxInstance = new lightbox.Lightbox( lightboxParam );
  lightboxInstance.open();
};

page.printAndClose = function()
{
  (function() {
    window.print();
    window.close();
  }.defer());
};

/**
 * Utility for data collection step manipulation
 */
page.steps = {};
page.steps.HIDE = "hide";
page.steps.SHOW = "show";

/**
 * Hide or show an array of steps given the step ids and
 * renumber all visible steps on the page.
 *
 * @param action - either page.steps.HIDE or page.steps.SHOW
 * @param stepIdArr - string array of step ids
 */
page.steps.hideShowAndRenumber = function ( action, stepIdArr )
{
  // hide or show each of the step ids given
  ($A(stepIdArr)).each( function( stepId )
  {
      page.steps.hideShow( action, stepId );
  });

  // get all H3 elements that contain css class of "steptitle"
  var stepTitleTags = [];
  $A(document.getElementsByTagName('h3')).each( function( tag )
  {
    if ( page.util.hasClassName( tag, 'steptitle' ) )
    {
      stepTitleTags.push( $(tag) );
    }
  });

  // starting at number 1, renumber all of the visible steps
  var number = 1;
  stepTitleTags.each(function( stepTitleTag )
  {
    if ( stepTitleTag.up('div').visible() )
    {
      stepTitleTag.down('span').update(number);
      number++;
    }
  });
};

/**
 * Hide or show a single step given the step id.
 *
 * @param action - either page.steps.HIDE or page.steps.SHOW
 * @param stepId - string identifier to a single step
 */
page.steps.hideShow = function ( action, stepId )
{
  if ( action == page.steps.SHOW )
  {
    $(stepId).show();
  }
  else if ( action == page.steps.HIDE )
  {
    $(stepId).hide();
  }
};

/**
 * Initializing the Expand/Collapse of the Step
 */
page.steps.initCollapsibleStep = function ( )
{
  $A( document.getElementsByClassName( "collapsibleStepTitle" ) ).each( function( stepTitle ) {
    Event.observe( $( stepTitle ), "click", this.page.steps.collapsibleStep.bindAsEventListener( this, stepTitle ) );
    Event.observe( $( stepTitle ), "keydown",
         function( event ) {
            var key = event.keyCode || event.which;
            if ( key == Event.KEY_RETURN || key == 32 )
            {
              page.steps.collapsibleStep( event, stepTitle );
            }
         }
    );
  });
};

page.steps.collapsibleStep = function( event, stepTitle )
{
    var content = $( stepTitle ).up().down("div");
    if ( content.visible() )
    {
      stepTitle.removeClassName( "collapsibleStepExpanded" );
      content.removeClassName( "collapsibleStepContentExpanded" );
      Effect.toggle(content.id, "slide", { duration: 0.5 });
      content.setAttribute("aria-hidden", "true");
      stepTitle.setAttribute("aria-expanded", "false");
    }
    else
    {
      stepTitle.addClassName( "collapsibleStepExpanded" );
      content.addClassName( "collapsibleStepContentExpanded" );
      Effect.toggle(content.id, "slide", { duration: 0.5 } );
      content.setAttribute("aria-hidden", "false");
      stepTitle.setAttribute("aria-expanded", "true");
    }
    Event.stop( event );
};

page.showChangeTextSizeHelp = function( )
{
  page.extendedHelp('internalhandle=change_text_size&helpkey=change_text_size','change_text_size' );
  return false;
};

page.showAccessibilityOptions = function()
{
   var win = window.open('/webapps/portal/execute/changePersonalStyle?cmd=showAccessibilityOptions',
       'accessibilityOptions','menubar=1,resizable=1,scrollbars=1,status=1,width=480,height=600');
   win.focus();
};

page.toggleContrast = function( )
{
  new Ajax.Request('/webapps/portal/execute/changePersonalStyle?cmd=toggleContrast',
  {
    onSuccess: function(transport, json)
    {
      var fsWin;
      if (window.top.nav)
      {
        fsWin = window.top;
      }
      else if (window.opener && window.opener.top.nav)
      {
        fsWin = window.opener.top;
        window.close();
      }
      if (fsWin)
      {
        fsWin.nav.location.reload();
        fsWin.content.location.reload();
      }
      else
      {
        window.top.location.reload();
      }
    }
  });
  return false;
};

/**
 * IFrame-based shim used with popups so they render on top of all other page elements (including applets)
 */
page.popupShim = Class.create();
page.popupShim.prototype =
{
  initialize: function( popup )
  {
    this.popup = popup;
  },

  close: function( )
  {
    this.toggleOverlappingEmbeds( false );
  },

  open: function( )
  {
    this.toggleOverlappingEmbeds( true );
  },

  toggleOverlappingEmbeds: function( turnOff )
  {
    ['embed','object','applet','select'].each( function( tag ) {
      var elems = document.getElementsByTagName( tag );
      for ( var i = 0, l = elems.length; i < l; i++ )
      {
        var e = $(elems[i]);

        /* Only show/hide overlapping object if the element is visible in the first place, otherwise there is no point.
         * Note that visible() checks the display property, and behaves differently from the visibility property being
         * set below, so we're safe when this method is being called with turn off|on.
         */
        if( e.visible() )
        {
          if ( !turnOff || ( page.util.elementsOverlap( this.popup, e ) && !e.descendantOf( this.popup ) ) )
          {
            elems[i].style.visibility = ( turnOff ? 'hidden' : '' );
          }
        }
      }
    }.bind( this ) );
  }
};

/**
 * Looks through the children of the specified element for links with the specified
 * class name, and if it finds any, autowires lightboxes to them.  If lightbox.js/effects.js
 * hasn't already been loaded, load it.
 */
page.LightboxInitializer = Class.create(
{
  initialize: function( className, parentElement, justThisParent )
  {
    this.className = className;
    if (justThisParent)
    {
      this.parentElement = parentElement;
    }
    var links = parentElement.getElementsByTagName('a');
    for ( var i = 0, l = links.length; i < l; i++ )
    {
      if ( page.util.hasClassName( links[i], className ) )
      {
        if ( window.lightbox && window.Effect)
        {
          this._autowire();
        }
        else
        {
          this._load();
        }
        break;
      }
    }
  },

  _autowire: function()
  {
    lightbox.autowireLightboxes( this.className, this.parentElement );
  },

  _load: function()
  {
    var h = $$('head')[0];
    // TODO: This code does not take version into account (so immediately after an upgrade this won't get the new file)...
    var scs = ( !window.lightbox ? [getCdnURL('/javascript/ngui/lightbox.js')] : []).concat(
                !window.Effect ? ['/javascript/scriptaculous/effects.js'] : [] );
    scs.each( function( sc )
    {
      var s = new Element('script', { type: 'text/javascript', src: getCdnURL(sc) } );
      h.appendChild( s );
    });
    this._wait();
  },

  _wait: function()
  {
    var count = 0;
    new PeriodicalExecuter( function( pe )
    {
      if ( count < 100 )
      {
        count++;
        if ( window.lightbox && window.Effect )
        {
          pe.stop();
          this._autowire();
        }
      }
      else // give up if it takes longer than 5s to load lightbox.js/effects.js
      {
        pe.stop();
      }
    }.bind(this), 0.05 );
  }
});




page.util.flyoutMenuMainButtonKeyboardHandler = function( event )
{
  var key = event.keyCode || event.which;
  if (key == Event.KEY_LEFT || key == Event.KEY_RIGHT)
  {
    var elem = Event.element( event );
    var target = elem.up( 'li' );
    while ( true )
    {
      if ( key == Event.KEY_LEFT )
      {
        target = target.previous();
      }
      else if ( key == Event.KEY_RIGHT )
      {
        target = target.next();
      }
      if ( !target || page.util.hasClassName( target, 'sub' ) ||
                      page.util.hasClassName( target, 'mainButton' ) ||
                      page.util.hasClassName( target, 'mainButtonType' ) )
      {
        break;
      }
    }
    if ( target )
    {
      var menuLinks = $A( target.getElementsByTagName( 'a' ) );
      if ( menuLinks && menuLinks.length > 0 )
      {
        menuLinks[ 0 ].focus();
        Event.stop( event );
      }
    }
  }
};

page.util.initFlyoutMenuBehaviourForListActionMenuItems = function( container ) {
  //Initialize accessible flyout menu behavior
  if ( !container )
  {
    container = document;
  }
  var uls = document.getElementsByTagName('ul');
  if (uls) {
    var numUls = uls.length;
    for (var i = 0; i < numUls; i++) {
      var ul = uls[i];
      if (page.util.hasClassName(ul, 'nav')) {
        var lis = ul.getElementsByTagName('li');
        if (lis) {
          var numLis = lis.length;
          for (var j = 0; j < numLis; j++) {
            var li = lis[j];
            if (page.util.hasClassName(li, 'sub')) {
              new page.FlyoutMenu($(li));
            } else if (page.util.hasClassName(li, 'mainButton') || page.util.hasClassName(li, 'mainButtonType')) {
              var menuLinks = $A($(li).getElementsByTagName('a'));
              if (menuLinks && menuLinks.length > 0) {
                Event.observe(menuLinks[0], 'keydown', page.util.flyoutMenuMainButtonKeyboardHandler.bindAsEventListener(menuLinks[0]));
              }
            }
          }
        }
      }
    }
  }
};

//LRN-67276 because of the 'same-origin' policy, the browser cannot inspect the DOM of embedded frames/iframes where the
//source is on a different 'origin'. if that happens, catch the exception and make sure we return a valid value for maxHeight
page.util.getMaxContentHeight = function( iframeElement )
{
  var maxHeight = iframeElement.contentWindow.document.body.scrollHeight;
  var frameElements;
  var iframeElements;
  if ( iframeElement.contentDocument )
  {
    // getElementsByTagName() returns a NodeList object, which is immutable and cannot easily be converted to an array
    frameElements = iframeElement.contentDocument.getElementsByTagName("frame");
    iframeElements = iframeElement.contentDocument.getElementsByTagName("iframe");
  }

  var i = 0;
  var frameHeight;
  var frameElement;

  try
  {
    for( i = 0; i < frameElements.length; i++ )
    {
      frameElement = frameElements[i];

      if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
      {
        frameHeight = frameElement.contentWindow.document.body.scrollHeight;
      }

      if( frameHeight > maxHeight )
      {
        maxHeight = frameHeight;
      }
    }
  }
  catch (e)
  {
    // ignore - see same-origin comment at the top of this function
  }

  try
  {
    for( i = 0; i < iframeElements.length; i++ )
    {
      frameElement = iframeElements[i];

      if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
      {
        frameHeight = frameElement.contentWindow.document.body.scrollHeight;
      }

      if( frameHeight > maxHeight )
      {
        maxHeight = frameHeight;
      }
    }
  }
  catch (e)
  {
    // ignore - see same-origin comment at the top of this function
  }

  return maxHeight;
};

//LRN-67276 because of the 'same-origin' policy, the browser cannot inspect the DOM of embedded frames/iframes where the
//source is on a different 'origin'. if that happens, catch the exception and make sure we return a valid value for maxWidth
page.util.getMaxContentWidth = function( iframeElement )
{
  var maxWidth = iframeElement.contentWindow.document.body.scrollWidth;
  var frameElements;
  var iframeElements;
  if ( iframeElement.contentDocument )
  {
    // getElementsByTagName() returns a NodeList object, which is immutable and cannot easily be converted to an array
    frameElements = iframeElement.contentDocument.getElementsByTagName("frame");
    iframeElements = iframeElement.contentDocument.getElementsByTagName("iframe");
  }

  var i = 0;
  var frameWidth;
  var frameElement;

  try
  {
    for( i = 0; i < frameElements.length; i++ )
    {
      frameElement = frameElements[i];

      if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
      {
        frameWidth = frameElement.contentWindow.document.body.scrollWidth;
      }

      if( frameWidth > maxWidth )
      {
        maxWidth = frameWidth;
      }
    }
  }
  catch (e)
  {
    // ignore - see same-origin comment at the top of this function
  }

  try
  {
    for( i = 0; i < iframeElements.length; i++ )
    {
      frameElement = iframeElements[i];

      if( frameElement.contentWindow && frameElement.contentWindow.document && frameElement.contentWindow.document.body )
      {
        frameWidth = frameElement.contentWindow.document.body.scrollWidth;
      }

      if( frameWidth > maxWidth )
      {
        maxWidth = frameWidth;
      }
    }
  }
  catch (e)
  {
    // ignore - see same-origin comment at the top of this function
  }

  return maxWidth;
};

page.subheaderCleaner =
{
  init : function( entityKind, divId )
  {
    var allHidden = true;
    var firstUl = null;
    var className = 'portletList-img courseListing ' + entityKind;
    var parentElement = $( divId ) || document;
    $A( parentElement.getElementsByClassName( className ) ).each( function( ul ) {
      if ( !ul.down() )
      {
        var prev = ul.previous( 'h3' ) || ul.previous( 'h4' );
        prev.hide();
        ul.hide();
        if ( !firstUl )
        {
          firstUl = ul;
        }
      }
      else
      {
        allHidden = false;
      }
    } );
    // if term grouping, hide term headings without courses/orgs
    className = 'termHeading-' + entityKind;
    $A( parentElement.getElementsByClassName( className ) ).each( function( termHeading ) {
      var hasVisibleBlocks = $A( termHeading.next( 'div' ).select( 'ul' ) ).any( function( block )
      {
        return block.visible();
      } );
      if ( !hasVisibleBlocks )
      {
        termHeading.hide();
      }
    } );
    if ( allHidden && firstUl )
    {
      firstUl.up( 'div' ).previous( 'div' ).show();
    }
  }
};

 /**
  * Set up any JavaScript that will always be run on load (that doesn't depend on
  * any application logic / localization) here.
  *
  * Please leave this at the bottom of the file so it's easy to find.
  *
  */
FastInit.addOnLoad( function()
{
  Event.observe( document.body, "click", page.ContextMenu.closeAllContextMenus.bindAsEventListener( window ) );

  Event.observe( document.body, "click", page.ContextMenu.alignArrowsInBreadcrumb.bindAsEventListener( window ) );

  Event.observe( document.body, 'keydown', function(event) {
    var key = event.keyCode || event.which;
    if ( key == 116 )  // reload current page on F5 key press
    {
      Event.stop( event );  // prevent browser from reloading complete frameset
      if ( Prototype.Browser.IE )
      {
        event.keyCode = 0;
      }
      (function() { window.location.reload( true ); }.defer());
      return false;
    }
  });

  page.util.initFlyoutMenuBehaviourForListActionMenuItems();

  if ( $('breadcrumbs') )
  {
    new page.BreadcrumbExpander($('breadcrumbs'));
    // If we're in the content wrapper, hide the content wrapper breadcrumb frame
    // so that we don't get stacked breadcrumbs.
    if ( window.name === 'contentFrame' )
    {
      var parent = window.parent;
      if ( parent )
      {
        var frameset = parent.document.getElementById( 'contentFrameset' );
        if ( frameset )
        {
          frameset.rows = "*,100%";
        }
      }
    }
  }

  var contentPane = $('contentPanel') || $('portalPane');
  if ( contentPane )
  {
    new page.LightboxInitializer( 'lb', contentPane );
  }

  // add a label for inventory table checkboxes, if needed
  $A(document.getElementsByTagName("table")).each( function( table )
  {
    if ( !page.util.hasClassName( table, 'inventory' ) )
    {
      return;
    }
    var rows = table.rows;
    if ( rows.length < 2 )
    {
      return;
    }
    for (var r = 0, rlen = rows.length - 1; r < rlen; r++)
    {
      var cells = rows[r+1].cells; // skip header row
      for (var c = 0, clen = cells.length; c < clen; c++)
      {
        var cell = $(cells[c]);
        var inp = cell.down('input');

        if ( !inp || ( inp.type != 'checkbox' && inp.type != 'radio' ) )
        {
          // We're only looking for checkbox/radio cells to label, so move on
          continue;
        }

        var lbl = cell.down('label');

        if (lbl && !lbl.innerHTML.blank())
        {
          break; // skip cells that already have a non-blank label
        }

        if ( !lbl )
        {  // add new label to checkbox
          lbl = new Element('label', {htmlFor: inp.id} );
          lbl.addClassName('hideoff');
          cell.insert({bottom:lbl});
        }
        var headerCell = $(cell.parentNode).down('th');
        if ( !headerCell )
        {
          break; // skip rows without header cell
        }

        // create a temporary clone of the header cell and remove any hidden divs I.e. context menus
        var tempCell = $(headerCell.cloneNode(true));
        var tempCellDivs = tempCell.getElementsByTagName("div");
        for ( var i = 0; i < tempCellDivs.length; i++ )
        {
          var d = tempCellDivs[i];
          if ( d && !$(d).visible() )
          {
            d.remove();
          }
        }
        var lblBody = tempCell.innerHTML.replace( /<\/?[^>]*>/g, '' );  // strip html tags from header
        lblBody = page.bundle.getString('inventoryList.select.item', lblBody);
        lbl.update( lblBody );  // set label to header contents (minus tags)
        break;
      }
    }
  });

  //set default font sizes to display text. hack to fix IE7 default font size issue.
  var sizes = {1:'xx-small', 2:'x-small', 3:'small', 4:'medium', 5:'large', 6:'x-large', 7:'xx-large'};
  var fonts = document.getElementsByTagName('font');
  for ( var i = 0; i < fonts.length; i++ )
  {
    var font = fonts[i];
    if ( font.size )
    {
      // Since some font elements may be manually created by end users we have to handle random
      // values in here.
      if (!font.size.startsWith("+") && !font.size.startsWith("-"))
      {
        var fsize = parseInt(font.size, 10);
        if (fsize > 0 && fsize < 8)
        {
          font.style.fontSize = sizes[fsize];
        }
      }
    }
  }

  page.scrollToEnsureVisibleElement();
  page.isLoaded = true;

});

/**
 * Class for adding an insertion marker within a list
 */
page.ListInsertionMarker = Class.create();
page.ListInsertionMarker.prototype =
{
  initialize: function( listId, position, key, text )
  {
    var list = $(listId);
    var listElements = list.childElements();
    // create a marker list item
    var marker = new Element('li',{'id':listId+':'+key, 'class':'clearfix separator' });
    marker.update('<h3 class="item" id=""><span class="reorder editmode"><span><img alt="" src="' + getCdnURL( "/images/ci/icons/generic_updown.gif" ) + '"></span></span><span class="line"></span><span class="text">'+text+'</span></h3>');
    //marker.setStyle({  position: 'relative', minHeight: '10px', padding: '0px', background: '#CCCCCC' });
    position = ( position > listElements.length ) ? listElements.length : position;

    // add marker to list
    if (listElements.length === 0)
    {
      list.insert({top:marker}); // add marker to top of empty list
    }
    else if (listElements.length == position)
    {
      list.insert({bottom:marker});  // add marker after last element
    }
    else
    {
      listElements[position].insert({before:marker});  // add marker before element at position
    }

    var select = $('reorderControls'+listId).down('select');
    // add a option for the marker to the keyboard repostioning select, if any
    if (select)
    {
      var option = new Element('option',{'value':key}).update( '-- '+text+' --' );
      if (listElements.length === 0)
      {
        select.insert({top:option});
      }
      else if (listElements.length == position)
      {
        select.insert({bottom:option});
      }
      else
      {
        $(select.options[position]).insert({before:option});
      }
    }
  }
};

page.scrollToEnsureVisibleElement = function( )
{
  var params = window.location.search.parseQuery();
  var ensureVisibleId = params.ensureVisibleId;
  if ( !ensureVisibleId )
  {
    return;
  }
  var ensureVisibleElement = $(ensureVisibleId);
  if ( !ensureVisibleElement )
  {
    return;
  }
  var pos = ensureVisibleElement.cumulativeOffset();
  var scrollY = pos.top;
  var bodyHeight = $( document.body ).getHeight();
  if (scrollY + ensureVisibleElement.getHeight() < bodyHeight)
  {
    return; // element is already visible
  }

  var receipt = $('inlineReceipt_good');
  if ( receipt && receipt.visible() ) // pin receipt to top
  {
    var offset = receipt.cumulativeOffset();
    offset.top = globalNavigation.getNavDivHeight();
    var w = parseInt(receipt.getStyle('width'), 10);
    if ( Prototype.Browser.IE ) // width in IE includes border & padding, need to remove it
    {
      var bw = parseInt(receipt.getStyle('borderLeftWidth'), 10) + parseInt(receipt.getStyle('borderRightWidth'), 10);
      var pw = parseInt(receipt.getStyle('paddingLeft'), 10) + parseInt(receipt.getStyle('paddingRight'), 10);
      w = w - bw - pw;
    }
    receipt.setStyle({
      position:"fixed",
      zIndex:"1000",
      left: offset.left + "px",
      top: offset.top + "px",
      width: w + "px"});
    scrollY = scrollY -  2 * receipt.getHeight();
  }
  // scroll window to show ensureVisibleElement
  window.location = '#' + ensureVisibleId;
};

/**
 * Recursively walks up the frameset stack asking each window to change their
 * document.domain attribute in anticipation of making a cross-site scripting
 * call to an LMS integration.
 *
 * <p>This should only be called from popup windows, as changing the document.domain
 * value of a window that is going to be reused later could do surprising things.
 *
 * @param domain Domain name shared by the Learn and LMS servers.
 */
page.setLmsIntegrationDomain = function( domain )
{
  if ( '' == domain )
  {
    return;
  }

  try
  {
    if ( parent.page.setLmsIntegrationDomain )
    {
      parent.page.setLmsIntegrationDomain( domain );
  }
  }
  catch ( err ) { /* Ignore */ }

  document.domain = domain;
};

page.refreshTopFrame = function()
{
  if ( window.top.nav )
  {
    window.top.nav.location.reload();
  }
};

// See BreadcrumbBarRenderer.java for code that calls this method.
page.rewriteTaskStatusUntilDone = function( spanId, taskId, courseId )
{
  var theSpan = $(spanId);
  if (theSpan)
  {
    new Ajax.Request("/webapps/blackboard/execute/getSystemTaskStatus?taskId=" + taskId + "&course_id=" + courseId ,
                     {
                       method: 'post',
                       onSuccess: function(transport, json)
                       {
                         var result = transport.responseText.evalJSON( true );
                         theSpan = $(spanId); // reload it just in case it was removed between the request and response
                         if (theSpan)
                         {
                           theSpan.update(result.text);
                           if (result.complete == "false")
                           {
                             setTimeout(function() {page.rewriteTaskStatusUntilDone(spanId, taskId, courseId);}, 3000);
                           }
                         }
                       },
                       onFailure: function(transport, json)
                       {
                         theSpan = $(spanId); //reload the span as above
                         if (theSpan)
                         {
                           theSpan.hide();
                           $(spanId+'error').show();
                         }
                       }
                     });
  }
};

/*
 * Clean up the task id which associated with the specified course, so that the inline warning does not show up again
 */
page.cleanTaskId = function( courseId )
{
  // we don't care about the result, at worse it will display again on the next page
  var url = "/webapps/blackboard/execute/courseMain?action=cleanTaskId&course_id=" + courseId +
            "&sessionId=" + getCookie( 'JSESSIONID' );
  new Ajax.Request( url, { method: 'post' } );
};

//that doesn't then any code utilizing these methods will not work 'as expected'. Current usage
//as/of the writing of this code is "ok" with that - the user won't get the perfect experience but it won't completely fail either.
page.putInSessionStorage = function( key, value )
{
  if ( typeof sessionStorage !== 'undefined' )
  {
    sessionStorage[ getCookie( 'JSESSIONID' ) + key ] = value;
  }
};

// any code utilizing these methods must have separately included cookie.js
// since we don't always include cookie.js
page.getFromSessionStorage = function( key )
{
  if ( typeof sessionStorage !== 'undefined' )
  {
    return sessionStorage[ getCookie( 'JSESSIONID' ) + key ];
  }
  return undefined;
};

page.aria = {};

page.aria.show = function ( element )
{
  $(element).show();
  element.setAttribute("aria-expanded", "true");
};

page.aria.hide = function ( element )
{
  $(element).hide();
  element.setAttribute("aria-expanded", "false");
};

page.aria.toggle = function ( element )
{
  if (Element.visible($(element)))
  {
    page.aria.hide(element);
  }
  else
  {
    page.aria.show(element);
  }
};

page.util.isIE = function ()
{
  return ( navigator.userAgent.toLowerCase().indexOf( "msie" ) != -1 );
};

page.util.isFirefox = function()
{
  return ( navigator.userAgent.toLowerCase().indexOf( "firefox" ) != -1 );
};

/*
 * We'd probably never want to set an empty title on an html element but unfortunately
 * due to a browser rendering issue(FF 20), there currently is a practical reason to do
 * so. By setting a title to a 'blank space'(!), we can prevent the title from the parent
 * element to show up when the user is interacting with a child {code}element{code}.
 * Currently this is necessary only for FF, and it can be changed as a need arise but you
 * MUST NOT set an empty space title in IE/Chrome because they will render it as an empty
 * title tooltip, which we don't want.
 * NOTE : An empty space title will be set only if a title is not already set to something
 *   other than an empty String.
 * Bug Ref. : LRN-67140
 */
page.util.setEmptyTitle = function( element )
{
  if( page.util.isFirefox() )
  {
    if ( element.title.blank() )
    {
      page.util.setTitle( element, ' ' );
    }
  }
};

page.util.setTitle = function( element, title )
{
  element.setAttribute( 'title', title );
};


page.FocusTrap = Class.create();
page.FocusTrap.prototype =
{
  /**
   * this method injects 2 invisible spans used to trap the focus inside this given div.  Once you tab into the div you
   * stay inside the div - should only be used on pages where you've dynamically loaded the div and placed the user into it
   * to start (otherwise on a full page reload this could be confusing)
   *
   * @param options.mainDiv - the id of the div where we want the focus to be trapped for Accessibility
   * @param options.initialSelector - selector to find the first element to focus on at the top of the div
   * @param options.finalSelector - optional selector to find the last element to focus on (if known)
   */
    initialize : function( options )
    {
      this.options = Object.extend( {
        mainDiv : null,
        initialSelector : null,
        finalSelector : null
      }, options);
      var mainDiv = $( this.options.mainDiv );
      // insert span at the end of the div
      this.endOfDivIndicator = this.getIndicatorSpan('Bot');
      mainDiv.insertBefore( this.endOfDivIndicator, null );
      this.startOfDivIndicator = this.getIndicatorSpan('Top');
      mainDiv.insertBefore( this.startOfDivIndicator, mainDiv.childNodes[0] );
      this.initialSelector = mainDiv.down( this.options.initialSelector );
      if ( this.options.finalSelector )
      {
        this.finalSelector = mainDiv.down( this.options.finalSelector );
      }

      // Note: Going on both keydown and keyup so that you can hold down the TAB key and have it work properly.
      Event.observe( mainDiv, 'keydown', this.handleKeyDown.bind(this) );
      Event.observe( mainDiv, 'keyup', this.handleKeyDown.bind(this) );
    },

    getIndicatorSpan : function (loc)
    {
      var span = new Element( "span" ).addClassName( "focustrap" );
      span.setAttribute( "tabIndex", "0" );
      span.id = 'focusTrap_' + loc + this.options.mainDiv;
      return span
    },

    handleKeyDown : function( event )
    {
      var code = event.keyCode || event.which;
      var elem = event.element();
      if ( code == Event.KEY_TAB)
      {
        // Note that while this logic does "work" it seems to have an issue we might be able to live with:
        // 1) Going backwards this has an explicit 'blank' item that you tab to which will be confusing (i.e. focusing on the end-of-div indicator
        // doesn't help unless we shift-tab again).  We might be able to make this work better by simulating another copy of event... another day though.
        if (event.shiftKey && this.startOfDivIndicator == elem)
        {
          // Going backwards
          if ( this.finalSelector )
          {
            page.util.focusAndScroll( this.finalSelector );
          }
          else
          {
            page.util.focusAndScroll( this.endOfDivIndicator );
            /* Tried a few things - leaving them here as work-in-progress... it doesn't work.
            var evt = document.createEvent( "KeyboardEvent" );
            if ( evt.initKeyEvent )
            {
              evt.initKeyEvent( "keyup", true, true, null, 0, 0, true, 0, Event.KEY_TAB,  Event.KEY_TAB );
            }
            else
            {
              evt.initKeyboardEvent( "keyup", true, true, null, 0, 0, true, 0, Event.KEY_TAB,  Event.KEY_TAB );
            }
            this.endOfDivIndicator.dispatchEvent( evt );
            */
          }
        }
        else if (!event.shiftKey && this.endOfDivIndicator == elem)
        {
          // going forwards.
          page.util.focusAndScroll(this.initialSelector);
        }
      }
    }
};

page.treatEnterAsClickOnElement = function( buttonElementId )
{
  Event.observe( $(buttonElementId), 'keypress', function(evt)
  {
    if ( evt.keyCode == Event.KEY_RETURN )
    {
      page.util.fireClick(this);
    }
  });
};

}/* ==================================================================
 *The JavaScript Validation objects to be used in form validation.
 * Copyright (c) 2001 by Blackboard, Inc.,
 * 1899 L Street, NW, 5th Floor
 * Washington, DC, 20036, U.S.A.
 * All rights reserved.
 * Submit RFC & bugs report to: aklimenko@blackboard.com
 * This software is the confidential and proprietary information
 * of Blackboard, Inc. ("Confidential Information").  You
 * shall not disclose such Confidential Information and shall use
 * it only in accordance with the terms of the license agreement
 * you entered into with Blackboard.
 * ==================================================================*/

/**
 * General purpose DOM utility methods. There's probably a better place for this.
 * Private methods and properties have names prefixed with "_".
 */
var bbDomUtil = {

  _inputTypes: [ 'input', 'textarea', 'select', 'button' ],

  _maxRecursion: 500,

  /**
   * @param elName name of the form input element (the request parameter name).
   * @return an array of two or more elements, a single element, or null.
   */
  getInputElementByName: function( elName )
  {
    var elArray = this._getInputElementsByNameInSection( 'dataCollectionContainer', elName );
    if ( elArray.length === 0 )
    {
      elArray = this._getInputElementsByName( elName );
    }
    return ( elArray.length === 0 ) ? null : ( elArray.length == 1 ? elArray[ 0 ] : elArray );
  },

  /*
   * @param sectionId the ID of any element inside a form
   * @return the enclosing form element or null
   */
  getEnclosingForm: function( sectionId )
  {
    var form = null;
    if ( sectionId )
    {
      var count;
      var section = document.getElementById( sectionId );
      while ( section )
      {
        ++count;
        if ( count > this._maxRecursion )
        {
          break;
        }
        if ( section.tagName && section.tagName.toLowerCase() == "form" )
        {
          form = section;
          break;
        }
        section = section.parentNode;
      }
    }
    return ( !form ) ? ( document.forms.length === 0 ? null : document.forms[ 0 ] ) : form;
  },

  /**
   * Adds some additional processing to account for an IE bug
   * @param id the ID of an element
   */
  getElementById: function( id )
  {
    var el = $( id );
    try
    {
      if ( el &&
           /msie|internet explorer/i.test( navigator.userAgent ) &&
           el.attributes.id &&
           el.attributes.id.value != id &&
           document.all )
      {
        // IE usually returns item at 0
        for ( var i = 0; i < document.all[ id ].length; ++i )
        {
          if ( document.all[ id ][ i ].attributes.id && document.all[ id ][ i ].attributes.id.value == id )
          {
            return $( document.all[ id ][ i ] );
          }
        }
      }
    }
    catch ( e )
    {
      // Ignore all exceptions
    }
    return el;
  },

  syncCheckboxToInput: function( checkboxElement, inputElement )
  {
    var checkbox = $( checkboxElement );
    var input = $( inputElement );
    if ( checkbox && input )
    {
      var checkIfNotEmpty = function( )
      {
        checkbox.checked = ( input.value.strip?input.value.strip( ):input.value )?true:false;
      };
      input.observe( 'change', checkIfNotEmpty );
      input.observe( 'blur', checkIfNotEmpty );
    }
  },

  /**
   * @param sectionId the ID of an element that restricts the scope of elements. Cannot be null.
   * @param elName name of the form input element (the request parameter name). Cannot be null.
   * @return an array of zero or more elements with the specified name in the scope of the specified parent element.
   */
  _getInputElementsByNameInSection: function( sectionId, elName )
  {
    var result = [];
    if ( sectionId )
    {
      var section = document.getElementById( sectionId );
      if ( section )
      {
        for ( var i = 0; i < this._inputTypes.length; ++i )
        {
          var elements = section.getElementsByTagName( this._inputTypes[ i ] );
          for ( var j = 0; j < elements.length; ++j )
          {
            if ( elements[ j ].name == elName )
            {
              result.push( elements[ j ] );
            }
          }
        }
      }
    }
    return result;
  },

  /**
   * @param elName name of the form input element (the request parameter name). Cannot be null.
   * @return an array of zero or more elements with the specified name.
   */
  _getInputElementsByName: function( elName )
  {
    var result = [];
    var elArray = document.getElementsByName( elName );
    var formName = null;
    for ( var i = 0; i < elArray.length; ++i )
    {
      if ( elArray[ i ].tagName.match( /^(input|select|textarea|button)$/i ) )
      {
        if ( elArray[ i ].form !== null )
        {
          if ( !formName )
          {
            formName = elArray[ i ].form.name;
          }
          else if ( formName != elArray[ i ] .form.name )
          {
            // Ignore elements that don't belong to the same form as the first one found.
            continue;
          }
        result.push( elArray[ i ] );
        }
      }
    }
    return result;
  }
};

/************************************************************
* Object formCheckList. Use this object to hold form objects
* to be validated and perform form validation
************************************************************/

var addElement, removeElement, removeAllElements, getElement, checkForm, CheckGroup;

var formCheckList = new formCheckList();
var skipValidation=false;

function formCheckList()
{
    this.checkList  = [];
    this.addElement = addElement;
    this.removeElement = removeElement;
    this.removeAllElements = removeAllElements;
    this.getElement = getElement;
    this.check      = checkForm;
}

function addElement(element)
{
    if ( typeof element.group != 'undefined' )
    {
        for ( var i=0; i < this.checkList.length;i++ )
        {
            if ( this.checkList[i].name == element.group )
            {
                this.checkList[i].addElement(element);
                return;
            }
        }
        var grp = new CheckGroup(element);
        grp.addElement(element);
        this.checkList[this.checkList.length] = grp;
        return;
    }
    this.checkList[this.checkList.length] = element;
}

function removeElement(name)
{
  for (var i = 0; i < this.checkList.length; ++i)
  {
    if ( this.checkList[i].fieldName == name )
    {
      this.checkList.splice(i, 1);
    }
  }
}

function getElement(name)
{
  for (var i = 0; i < this.checkList.length; ++i)
  {
    if ( this.checkList[i].fieldName == name )
    {
      return this.checkList[i];
    }
  }
}

function removeAllElements()
{
  var valSize = this.checkList.length;
  this.checkList.splice(0, valSize);
}

function checkForm()
{
    if ( typeof(window.invalidAnswersTmp)!='undefined' )
    {
        window.invalidAnswersTmp=[];
    }
    var valid =true;
    for ( var i=0;i<this.checkList.length;i++ )
    {
        if ( this.checkList[i].canValidate && !this.checkList[i].canValidate() )
        {
          // cannot validate the input so skip it and continue onto the next input
          continue;
        }
        if ( !this.checkList[i].check() )
        {
            if ( this.checkList[i].answerChk )
            {
                valid=false;
            }
            else
            {
                return false;
            }
        }
    }
    return valid;
}
///////////////////End of object formCheckList////////////////

/************************************************************
* Object: inputText. Use this object to validate text input in
* your form (for input type == text|password|textarea|BUT NOT FILE!!! (FILE IS READ-ONLY))
************************************************************/
function inputText(h)
{
    if (h.id) {
      this.element       = bbDomUtil.getElementById( h.id );
    } else {
      this.element          = 'bbDomUtil.getInputElementByName("'+h.name+'")';
    }
    this.shouldFocus          = h.shouldFocus;
    if ( h.shouldFocus === undefined )
    {
      this.shouldFocus = true;
    }
    if ( this.shouldFocus )
    {
      this.formatElement        = 'bbDomUtil.getInputElementByName("'+h.display_format+'")';
      this.focusElement         = h.focus_element; // override element for focus in case of error
    }
    this.fieldName            = h.name;
    this.disable_script       = h.disable_script;
    this.ref_label            = h.ref_label;

    this.custom_alert         = h.custom_alert;
    this.custom_alert_cmp     = h.custom_alert_cmp;

    this.minlength            = h.minlength;
    this.maxlength            = h.maxlength;
    this.trim                 = h.trim;
    this.regex                = h.regex;
    this.regex_msg            = h.regex_msg;
    this.regex_match          = h.regex_match;
    this.verify               = h.verify;
    this.skipMD5              = h.skipMD5;
    this.check                = inputTextCheck;
    this.valid_number         = h.valid_number;
    this.integer_number       = h.integer_number;
    this.min_value            = h.min_value;
    this.max_value            = h.max_value;
    this.nonnegative          = h.nonnegative;
    this.valid_float          = h.valid_float;
    this.allow_negative_float = h.allow_negative_float;
    this.valid_percent        = h.valid_percent;
    this.allow_negative_percent = h.allow_negative_percent;
    this.valid_efloat         = h.valid_efloat; // float with optional exponent
    this.valid_email          = h.valid_email;
    this.valid_url            = h.valid_url;
    this.required_url         = h.required_url;
    this.invalid_chars        = h.invalid_chars; // eg: /[%&#<>=+,]/g
    this.cmp_element          = 'bbDomUtil.getInputElementByName("'+h.cmp_field+'")';
    this.cmp_ref_label        = h.cmp_ref_label;
    this.xor                  = h.xor;
    this.cmp_required         = h.cmp_required;
    this.activeX              = h.activeX;   // synch activeX to hidden field before submission
    this.isHtmlDoc            = h.isHtmlDoc; // is portfolio with body and html
    this.img_check            = h.img_check;
    this.empty_value_warn     = h.empty_value_warn;
    this.valid_system_role_id  = h.valid_system_role_id;
    this.required              = h.required;
    this.canValidate           = h.canValidate; // callback function to determine whether the inputtext should be validated
    if (h.ref_and_regex === undefined)
    {
      this.ref_and_regex = true;
    }
    else
    {
      this.ref_and_regex = h.ref_and_regex;
    }

    if ( document.all && document.getElementById(h.name+'_ax') )
    {
        this.axobj = document.getElementById(h.name+'_ax');
    }

    // Add here anything you need to validate
}

function isAnEmptyVtbe(val)
{
  // Different browsers populate an 'empty' VTBE with a different blank line - look for any of the known combinations and ignore them.
  // NOTE: Changes to this method need to be reflected in AssessmentDisplayControl.isAnEmptyVtbe
  return ( !val ||
           !val.replace(/<p><\/p>/gi,'').trim() ||
           !val.replace(/<br \/>/gi,'').trim() ||
           !val.replace(/&nbsp;/gi,'').trim());
}

// Do actual check here
function inputTextCheck()
{
    if ( this.shouldFocus === undefined )
    {
      this.shouldFocus = true;
    }

    var element = eval(this.element);
    var cmp_element = eval(this.cmp_element);

    if ( element )
    {
        // don't validate disabled elements
      if (element.disabled)
      {
        return true;
      }

        var focusElement = element;
        if ( this.axobj )
        {
            focusElement = this.axobj;
        }

        this.custom_alert     = (typeof this.custom_alert     != 'undefined') ? this.custom_alert     : '';
        this.custom_alert_cmp = (typeof this.custom_alert_cmp != 'undefined') ? this.custom_alert_cmp : '';

        this.ref_label = (typeof this.ref_label != 'undefined') ? this.ref_label
        : JS_RESOURCES.getFormattedString('field_name.substitute', [element.name]);
        var val    = element.value;
        if ( isAnEmptyVtbe(val) )
        {
            val='';
        }
        var trimmedVal, numVal, isValidNum, re;

        if ( this.activeX && isEmptyWysiwyg(element) )
        {
            element.value = '';
            val = '';
        }

        if ( typeof eval(this.formatElement) != "undefined" && eval(this.formatElement) !== null )
        {
            //Check if it is a mathml where;
            if ( /<APPLET ID="(\d+)" NAME="(\w+)"/.test(element.value) )
            {
                if ( getRadioValue(eval(this.formatElement)) == 'P' )
                {
                    if ( !confirm(JS_RESOURCES.getString('validation.plain_text.confirm')) )
                    {
                        if ( this.shouldFocus )
                        {
                          safeFocus( element );
                        }
                        return false;
                    }
                }
            }
        }

        if ( this.trim )
        {
            val = val.trim();
            element.value = val;
        } //Remove leading & trailing spaces if needed

        if ( typeof cmp_element != 'undefined' )
        {
            if ( this.xor )
            {
                if ( val.trim()=='' ^ cmp_element.value.trim()=='' )
                {
                    if ( val.trim()=='' )
                    {
                        alert( this.custom_alert ? this.custom_alert :
                               JS_RESOURCES.getFormattedString('validation.cmp_field.required',
                                                               [this.ref_label, this.cmp_ref_label]));
                        if ( this.shouldFocus )
                        {
                          shiftFocus(focusElement, this.activeX);
                        }
                    }
                    else
                    {
                        alert(this.custom_alert_cmp ? this.custom_alert_cmp :
                              JS_RESOURCES.getFormattedString('validation.cmp_field.required',
                                                              [this.cmp_ref_label, this.ref_label]));
                        if ( this.shouldFocus )
                        {
                          safeFocus( cmp_element );
                        }
                    }
                    return false;
                }
            }
        }

        if ( this.disable_script )
        {
            if ( typeof eval(this.formatElement) == "undefined" || getRadioValue(eval(this.formatElement)) != 'P' )
            {
                re = /<\s*script/ig;
                var re1 = /<\s*\/\s*script\s*>/ig;
                val = val.replace(re,'<disabled-script');
                val = val.replace(re1,'</disabled-script>');
                var re2 = /href\s*=\s*(['"]*)\s*javascript\s*:/ig;
                val = val.replace(re2,"href=$1disabled-javascript:");
                element.value = val;
            }
        }

        if ( this.valid_number )
        {
            trimmedVal = val.trim();
            //added this check bcoz for numeric fields which are not required, this function was not working
            if ( trimmedVal!="" )
            {
                var numLocalizer = new NumberLocalizer();
                if ( numLocalizer === undefined )
                {
                  numVal = parseInt(trimmedVal, 10);
                }
                else
                {
                  numVal = numLocalizer.parseNumber( trimmedVal );
                }
                isValidNum = !isNaN(numVal);
                if ( !isValidNum )
                {
                    alert(JS_RESOURCES.getFormattedString('validation.number', [this.ref_label]));
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
                if (this.integer_number)
                {
                    re = /^[+-]?[0-9]+$/;
                    if ( !re.test( trimmedVal ))
                    {
                        alert(JS_RESOURCES.getFormattedString('validation.integer_number', [this.ref_label]));
                        if ( this.shouldFocus )
                        {
                          safeFocus( element );
                        }
                        return false;
                    }
                }
                if (this.nonnegative && numVal<0)
                {
                    alert(JS_RESOURCES.getFormattedString('validation.negative', [this.ref_label]));
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
                if ( ( (this.min_value || this.min_value === 0) && numVal < this.min_value ) ||
                     ( this.max_value && ( numVal > this.max_value ) ) )
                {
                    alert(JS_RESOURCES.getFormattedString('validation.invalid_value', [this.ref_label]));
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
            }
        }

        if ( this.valid_float )
        {
            trimmedVal = val.trim();

            var numFormat;
            if ( this.allow_negative_float )
            {
                numFormat = LOCALE_SETTINGS.getString('float.allow.negative.format');
            }
            else
            {
                numFormat = LOCALE_SETTINGS.getString('float.format');
            }

            if ( numFormat )
            {
                //hand parse for l10n
                re = new RegExp( numFormat );
                isValidNum = trimmedVal.search( re ) === 0;
            }
            else
            {
                //try to use platform native (non-localized)
                numVal = parseFloat(trimmedVal);
                isValidNum = !isNaN(numVal);
                if ( isValidNum && numVal.toString().length != trimmedVal.length )
                {
                    /* Allow strings with trailing zeros to pass */
                    re = /^[\.0]+$/;
                    isValidNum = re.test(trimmedVal.substring(numVal.toString().length));
                }
            }
            if ( !isValidNum )
            {
                alert(JS_RESOURCES.getFormattedString('validation.number', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( element );
                }
                return false;
            }
        }

        if ( this.valid_percent )
        {
          if ( this.allow_negative_percent )
          {
            if ( !isValidNegativePercent(val) )
            {
                alert(JS_RESOURCES.getFormattedString('validation.allow_negtive.percent', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( element );
                }
                return false;
            }
          }
          else
          {
            if ( !isPercent(val) )
            {
                alert(JS_RESOURCES.getFormattedString('validation.percent', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( element );
                }
                return false;
            }
          }
        }

        if ( this.valid_efloat )
        {
            if ( !isNumeric(val) )
            {
                alert(JS_RESOURCES.getFormattedString('validation.number', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  focusElement = (this.focusElement ? this.focusElement : this.element);
                  if ( focusElement.focus )
                  {
                      safeFocus( focusElement );
                  }
                }
                return false;
            }
        }

        if ( this.valid_email )
        {
            if ( val.trim() == '' )
            {
                if ( confirm(JS_RESOURCES.getString('warning.email')) )
                {
                    return true;
                }
                else
                {
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
            }
            else
            {
                re = /^(['`a-zA-Z0-9_+\.\-])+\@(([a-zA-Z0-9\-])+\.)+([a-zA-Z0-9])+$/;
                if ( !re.test(val) )
                {
                    alert(JS_RESOURCES.getFormattedString('validation.email', [this.ref_label]));
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
            }
        }

        // confirms via javascript pop-up if input field is empty;
        // user can click Ok to proceed or cancel to go back with the element focused
        // the message that pops up is the message passed in with ref_label
        if ( this.empty_value_warn )
        {
            if ( val.trim() == '' )
            {
                if ( confirm(this.ref_label) )
                {
                    return true;
                }
                else
                {
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
            }
        }

if ( val.length < this.minlength )
        {
            if ( this.minlength == 1 )
            {
                alert(this.custom_alert ? this.custom_alert
                      : JS_RESOURCES.getFormattedString('validation.required', [this.ref_label]));
            }
            else
            {
                alert(this.custom_alert ? this.custom_alert
                      : JS_RESOURCES.getFormattedString('validation.minimum_length',
                                                        [this.minlength, this.ref_label]));
            }
            if ( this.shouldFocus )
            {
              shiftFocus(focusElement, this.activeX);
            }
            return false;
        }

        var extra = 0;
      if (navigator.appName=="Netscape" &&
          parseInt(navigator.appVersion, 10 )>=5) {
         var index = val.indexOf('\n');
         while(index != -1) {
             extra += 1;
             index = val.indexOf('\n',index+1);
         }
      }
    if ( this.maxlength < val.length + extra )
        {
          var newlength = val.length + extra;
            if ( (newlength - this.maxlength) > 1 )
            {
                alert(JS_RESOURCES.getFormattedString('validation.maximum_length.plural',
                                                      [this.ref_label,this.maxlength,(newlength-this.maxlength)]));
            }
            else
            {
                alert(JS_RESOURCES.getFormattedString('validation.maximum_length.singular',
                                                      [this.ref_label,this.maxlength]));
            }
            if ( this.shouldFocus )
            {
              shiftFocus(focusElement, this.activeX);
            }
            return false;
        }

        // required_url, unlike valid_url, flags empty strings as invalid URLs.
        if ( this.required_url )
        {
            if ( val.trim() == '' )
            {
                alert(JS_RESOURCES.getFormattedString('validation.required', [this.ref_label]));
                return false;
            }
            
            this.valid_url = true;  // since the url is required, it also must be valid
        }
        
        if ( this.valid_url )
        {
            if ( val.trim()=='' )
            {
                return true;  // should not reach here if required_url is true 
            }

            if ( !isValidUrl(val) )
            {
                // Special case for b2-authored links which are legitimate to not be fully qualified URLs. See launch_external.jsp and B2 documentation
                if( val.startsWith( "/webapps/blackboard/launch_external.jsp" ) )
                {
                  return true;
                }
                
                alert(JS_RESOURCES.getFormattedString('validation.url', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( element );
                }
                return false;
            }
        }

        if ( typeof(this.regex) == 'string' )
        {
            this.regex=eval(this.regex);
        }

        if ( (typeof(this.regex) == 'object' || typeof(this.regex) == 'function') && val.trim() != '' )
        {
            re =this.regex;
            if ( this.regex_match && val.search(re) == -1 )
            {
                alert(this.regex_msg + (this.ref_and_regex?(this.ref_label + '.'):''));
                if ( this.shouldFocus )
                {
                  shiftFocus(focusElement, this.activeX);
                }
                return false;
            }
            if ( !this.regex_match && re.test(val) )
            {
                alert(this.regex_msg + (this.ref_and_regex?(this.ref_label + '.'):''));
                if ( this.shouldFocus )
                {
                  shiftFocus(focusElement, this.activeX);
                }
                return false;
            }
        }

        if ( this.invalid_chars )
        {
            // if string was passed, convert to regular expression object
            if( Object.isString( this.invalid_chars ) )
            {
                var stringToParse = this.invalid_chars;
                var firstSlashPos = stringToParse.indexOf("/");
                var lastSlashPos = stringToParse.lastIndexOf("/");

                var pattern = stringToParse.substring( ++firstSlashPos, lastSlashPos );
                var modifier = stringToParse.substring( ++lastSlashPos, stringToParse.length );
                this.invalid_chars = new RegExp( pattern, modifier );
            }

            var arr = val.invalidChars(this.invalid_chars);

            if ( arr && arr.length )
            {
                alert(JS_RESOURCES.getFormattedString('validation.invalid_chars',
                                                      [this.ref_label, arr.join(', ')]));
                if ( this.shouldFocus )
                {
                  shiftFocus(focusElement, this.activeX);
                }
                return false;
            }
        }

        if ( this.verify )
        {
            var chk_field = bbDomUtil.getInputElementByName(element.name.replace(/_inp$/,'_chk'));
            var field     = bbDomUtil.getInputElementByName(element.name.replace(/_inp$/,''));

            if ( chk_field.value != val )
            {
                alert(JS_RESOURCES.getFormattedString('validation.mismatch', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( chk_field );
                }
                return false;
            }
            // Encode password
            if ( element.type == 'password' )
            {
                element.value = element.value.trim();
                if ( element.value != '' )
                {
                    if ( !this.skipMD5 )
                    {
                      element.value = field.value = chk_field.value = calcMD5(element.value);
                    }
                }
                else
                {
                    alert(JS_RESOURCES.getString('validation.password'));
                    element.value = field.value ='';
                    if ( this.shouldFocus )
                    {
                      safeFocus( element );
                    }
                    return false;
                }
            }
        }

        if ( this.cmp_required && element.value.trim()!='' )
        {
            if ( !cmp_element.value.trim().length )
            {
                alert(JS_RESOURCES.getFormattedString('validation.cmp_field.rejected',
                                                      [this.ref_label, this.cmp_ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( cmp_element );
                }
                return false;
            }
        }

        if ( this.img_check )
        {
            return image_check(element);
        }


    //AS-102122, if a image tag without ALT properties <img src="1.jpg">, add a null ALT for it. <img src="1.jpg" alt="">
    imgTag_check(element,0);


        // System role ids cannot begin with "BB" as of 7.2; such ids are reserved for solely for Blackboard use
        // Checks field to see if string begins with "BB" case-insensitive and if so, alert the user
        if ( this.valid_system_role_id )
        {
            if ( element.value.indexOf('BB') === 0 || element.value.indexOf('bb') === 0 )
            {
                alert(this.custom_alert ? this.custom_alert : JS_RESOURCES.getFormattedString('validation.system_role.reserve', [this.ref_label]));
                if ( this.shouldFocus )
                {
                  safeFocus( element );
                }
                return false;
            }
            else
            {
                return true;
            }
        }

    }
    return true;
}

///////////////////End of object inputText///////////////////
//check ALT propertity for <img tag, if there isn't ALT propertiry, add ALT="" for this tag
function imgTag_check(element , start){
  var imgStart = element.value.indexOf("<img",start); // img: <img src=... >
  if (imgStart > -1 ){
    var end = element.value.indexOf(">",imgStart);
    if (end == -1 ){
      return;
    }
    var imgData = element.value.substring(imgStart, end+1); //  <img src=... >
    if(imgData.indexOf("alt") == -1){
      imgData = "<img alt=\"\" " + imgData.substring(4);
      element.value = element.value.substring(0,imgStart) + imgData + element.value.substring(end+1);
    }
    imgTag_check(element, end);
  }
}

function image_check(element)
{
    var ext = element.value.match(/.*\.(.*)/);
    ext = ext ? ext[1] :'';
    var re = /gif|jpeg|png|tif|bmp|jpg/i;
    if ( ! re.test(ext) && element.value )
    {
        if ( ! confirm(JS_RESOURCES.getFormattedString('validation.image_type', [ext])) )
        {
            element.focus();
            return false;
        }
    }
    return true;
}

/************************************************************
* Object: inputDate. Use this object to validate that the
* associated date fields are not empty
************************************************************/

var inputDateCheck;

function inputDate(h)
{
    this.element_mm        = 'bbDomUtil.getInputElementByName("'+h.name+'_0_mm")';
    this.element_dd        = 'bbDomUtil.getInputElementByName("'+h.name+'_0_dd")';
    this.element_yyyy      = 'bbDomUtil.getInputElementByName("'+h.name+'_0_yyyy")';

    this.fieldName      = h.name;
    this.ref_label      = h.ref_label;

    this.custom_alert     = h.custom_alert;
    this.custom_alert_cmp = h.custom_alert_cmp;

    this.check          = inputDateCheck;

    // Add here anything you need to validate
}

// Do actual check here
function inputDateCheck()
{
    var element_mm   = eval(this.element_mm);
    var element_dd   = eval(this.element_dd);
    var element_yyyy = eval(this.element_yyyy);

    if ( typeof element_mm != 'undefined' && element_dd !='undefined' && element_yyyy !='undefined' )
    {
        this.custom_alert = (typeof this.custom_alert != 'undefined') ? this.custom_alert : '';

        this.ref_label = ( this.ref_label ) ? this.ref_label
        : JS_RESOURCES.getFormattedString('field_name.substitute', [this.element_mm.name]);

        if ( element_mm.selectedIndex == -1 || element_dd.selectedIndex == -1 || element_yyyy == -1 )
        {
            alert(this.custom_alert ? this.custom_alert
                  : JS_RESOURCES.getFormattedString('validation.date.required', [this.ref_label]));

            if ( element_mm.selectedIndex == -1 )
            {
                element_mm.focus();
            }
            else if ( element_dd.selectedIndex == -1 )
            {
                element_dd.focus();
            }
            else
            {
                element_yyyy.focus();
            }

            return false;
        }
    }

    return true;
}
///////////////////End of object inputDate///////////////////

/************************************************************
* Object: inputTime. Use this object to validate that the
* associated time fields are not empty
************************************************************/
var inputTimeCheck;

function inputTime(h)
{
    this.element_hh        = 'bbDomUtil.getInputElementByName("'+h.name+'_0_hh")';
    this.element_mi        = 'bbDomUtil.getInputElementByName("'+h.name+'_0_mi")';
    this.element_am        = 'bbDomUtil.getInputElementByName("'+h.name+'_0_am")';

    this.fieldName      = h.name;
    this.ref_label      = h.ref_label;

    this.custom_alert     = h.custom_alert;
    this.custom_alert_cmp = h.custom_alert_cmp;

    this.check          = inputTimeCheck;

    // Add here anything you need to validate
}

// Do actual check here
function inputTimeCheck()
{
    var element_hh   = eval(this.element_hh);
    var element_mi   = eval(this.element_mi);
    var element_am   = eval(this.element_am);

    if ( typeof element_hh != 'undefined' && element_mi !='undefined' && element_am !='undefined' )
    {
        this.custom_alert = (typeof this.custom_alert != 'undefined') ? this.custom_alert : '';

        this.ref_label = (typeof this.ref_label != 'undefined') ? this.ref_label
        : JS_RESOURCES.getFormattedString('field_name.substitute', [this.element_hh.name]);

        if ( element_hh.selectedIndex == -1 || element_mi.selectedIndex == -1 || element_am == -1 )
        {
            alert(this.custom_alert ? this.custom_alert
                  : JS_RESOURCES.getFormattedString('validation.time.required', [this.ref_label]));

            if ( element_hh.selectedIndex == -1 )
            {
                element_hh.focus();
            }
            else if ( element_mi.selectedIndex == -1 )
            {
                element_mi.focus();
            }
            else
            {
                element_am.focus();
            }
            return false;
        }
    }

    return true;
}

///////////////////End of object inputTime///////////////////

/************************************************************
* Object: inputSelect. Use this object to validate that the
* associated select field is not empty
************************************************************/
var inputSelectCheck;

function inputSelect(h)
{
    this.element        = 'bbDomUtil.getInputElementByName("'+h.name+'")';

    this.fieldName      = h.name;
    this.ref_label      = h.ref_label;

    this.minSelected = h.minSelected;
    this.maxSelected = h.maxSelected;
    this.title      = h.title;
    this.isMultiSelect = h.isMultiSelect;

    this.custom_alert     = h.custom_alert;
    this.custom_alert_cmp = h.custom_alert_cmp;

    this.check          = inputSelectCheck;

    // Add here anything you need to validate
}

// Do actual check here
function inputSelectCheck()
{
    var element   = eval(this.element);
    var checked = 0;
    if ( typeof element != 'undefined' )
    {
        if ( this.isMultiSelect)
        {
            if( this.minSelected )
            {
              //check that at least minSelected number of options is selected //bsomala

              checked = element.options.length;

              if(checked < this.minSelected)
              {
                alert(this.title+' -- '+JS_RESOURCES.getFormattedString('validation.multiSelect.minItems', [this.minSelected]));
              element.focus();
              return false;
              }
            }
            checked = 0;
            if ( this.maxSelected )
            {
              checked = element.options.length;

              if(checked > this.maxSelected)
              {
                alert(this.title+' -- '+JS_RESOURCES.getFormattedString('validation.multiSelect.maxItems', [this.maxSelected]));
              element.focus();
              return false;
              }
            }
        }
        else
        {
          this.custom_alert = (typeof this.custom_alert != 'undefined') ? this.custom_alert : '';

          this.ref_label = (typeof this.ref_label != 'undefined') ? this.ref_label
          : JS_RESOURCES.getFormattedString('field_name.substitute', [element.name]);

          if ( (element.selectedIndex == -1) || (element.options[element.selectedIndex].value == "") )
          {
              alert(this.custom_alert ? this.custom_alert
                    : JS_RESOURCES.getFormattedString('validation.required', [this.ref_label]));
              element.focus();
              return false;
          }
        }
    }

    return true;
}

///////////////////End of object inputSelect///////////////////

/************************************************************
* Object: inputFile. Use this object to validate that the file upload
is not empty. IMPORTANT: file type is READ ONLY
************************************************************/
var inputFileCheck;

function inputFile(h)
{
    this.element        = 'bbDomUtil.getInputElementByName("'+h.name+'")';
    this.fieldName      = h.name;
    this.ref_label      = h.ref_label;

    this.custom_alert     = h.custom_alert;
    this.custom_alert_cmp = h.custom_alert_cmp;

    this.invalid_chars  = h.invalid_chars;
    this.minlength      = h.minlength;
    this.img_check      = h.img_check;
    this.check          = inputFileCheck;

    // Add here anything you need to validate
}


// Do actual check here
function inputFileCheck()
{

    var element = eval(this.element);
    if ( typeof element != 'undefined' )
    {

        this.custom_alert     = (typeof this.custom_alert     != 'undefined') ? this.custom_alert     : '';

        this.ref_label = (typeof this.ref_label != 'undefined') ? this.ref_label
        : JS_RESOURCES.getFormattedString('field_name.substitute', [element.name]);
        var val    = element.value;


        if ( this.invalid_chars )
        {
            var arr = val.invalidChars(this.invalid_chars);

            if ( arr && arr.length )
            {
                alert(JS_RESOURCES.getFormattedString('validation.invalid_chars',
                                                      [this.ref_label, arr.join(', ')]));
                shiftFocus( element, false);
                return false;
            }
        }

        if ( val.length < this.minlength )
        {
            if ( this.minlength == 1 )
            {
                alert(this.custom_alert ? this.custom_alert
                      : JS_RESOURCES.getFormattedString('validation.required', [this.ref_label]));
            }
            else
            {
                alert(this.custom_alert ? this.custom_alert
                      : JS_RESOURCES.getFormattedString('validation.minimum_length',
                                                        [this.minlength, this.ref_label]));
            }

            return false;
        }

        if ( this.img_check )
        {
            return image_check(element);
        }

    }
    return true;
}

///////////////////End of object inputFile///////////////////








/************************************************************
*    Object: Check_EventTime. Use this object to make sure
*    that the end time is not before the start time, confirm pastdue time,
*    check duration of the event.
*************************************************************/

var Check_EventTime_check;

function Check_EventTime(obj)
{
    this.start      = "bbDomUtil.getInputElementByName('"+obj.name+"')";
    this.end        = "bbDomUtil.getInputElementByName('"+obj.cmp_field+"')";
    //restrict flags fields
    this.restrict   = "bbDomUtil.getInputElementByName('"+obj.restrict_flag+"')";
    this.cmp_restrict="bbDomUtil.getInputElementByName('"+obj.cmp_restrict_flag+"')";

    this.ref_lbl    = obj.ref_label;
    this.cmp_ref_lbl= obj.cmp_ref_label;
    this.notEqual   = obj.duration;
    this.pastDue    = obj.past_due;
    this.show_end_time = obj.show_end_time;
    // define method
    this.check      = Check_EventTime_check;
}

function Check_EventTime_check()
{
    var start, end, restr, cmp_restr;
    start = eval(this.start);     // first datetime field
    end   = eval(this.end);         // second datetime field to be compared with first
    restr = eval(this.restrict);    // Restrict checkbox field
    cmp_restr = eval(this.cmp_restrict);  // Restrict checkbox field to compare to
    restr     = (typeof(restr)     != 'undefined') ? restr.checked : true;      // True if restrict checkbox
    cmp_restr = (typeof(cmp_restr) != 'undefined') ? cmp_restr.checked : true;  // is checked or not defined

    // Update time in hidden field
    // Set time to empty string if it is not restricted
    if ( !restr )
    {
        start.value = '';
    }
    if ( !cmp_restr || (this.show_end_time && !restr) )
    {
        end.value   = '';
    } // Second field has to be set also
    start = start.value;
    if ( typeof end != 'undefined' )
    {
        end = end.value;
    }
    // Do not compare fields if at least one checkbox is unchecked
    if ( !restr || !cmp_restr )
    {

        this.notEqual = 0;
    }
    // Do not test for past due if restiction is not applied

    if ( !restr )
    {
        this.pastDue = 0;
    }
    if ( this.pastDue )
    {
        var confirm;
        var start_ms = Date.parse(start.replace(/-/g,'/'));
        if ( start_ms < Date.parse(new Date())-this.pastDue*1000*60 )
        {
            if ( !window.confirm(JS_RESOURCES.getFormattedString('validation.date_past.confirm', [this.ref_lbl])) )
            {
                return false;
            }
        }
    }
    if ( (document.forms[0].restrict_start && document.forms[0].restrict_end)||
         (document.forms.length > 1 && document.forms[1].restrict_start && document.forms[1].restrict_end) )
    {
        if ( (document.forms[0].restrict_start && document.forms[0].restrict_end && document.forms[0].restrict_start.checked && document.forms[0].restrict_end.checked) ||
             (document.forms.length > 1 && document.forms[1].restrict_start && document.forms[1].restrict_end && document.forms[1].restrict_start.checked && document.forms[1].restrict_end.checked) )
        {
            if ( start > end && this.notEqual )
            {
                alert(JS_RESOURCES.getFormattedString('validation.date_past',
                                                      [this.cmp_ref_lbl, this.ref_lbl]));
                return false;
            }
            else if ( end == start && this.notEqual )
            {
                alert(JS_RESOURCES.getFormattedString('validation.date_equal',
                                                      [this.cmp_ref_lbl, this.ref_lbl]));
                return false;
            }
        }
    }
    else
    {
        if ( start > end && this.notEqual )
        {
            alert(JS_RESOURCES.getFormattedString('validation.date_past',
                                                  [this.cmp_ref_lbl, this.ref_lbl]));
            return false;
        }
        else if ( end && end == start && this.notEqual )
        {
            alert(JS_RESOURCES.getFormattedString('validation.date_equal',
                                                  [this.cmp_ref_lbl, this.ref_lbl]));
            return false;
        }
    }
    return true;
}
/*
 * SCR  17696
 * This validation check should be used in the date widgets instead of the earlier one
 * as that has the chackboxes names hardcoded in them. The existing date wodgets
 * use it, but going ahead this should be the used. It helps specially when there are
 * multiple date widgets on the same page.
*/
var Check_EventTime_check_multiple;

function Check_EventTime_multiple(obj)
{
    this.start      = "bbDomUtil.getInputElementByName('"+obj.name+"')";
    this.end        = "bbDomUtil.getInputElementByName('"+obj.cmp_field+"')";
    //restrict flags fields
    this.restrict   = "bbDomUtil.getInputElementByName('"+obj.restrict_flag+"')";
    this.cmp_restrict="bbDomUtil.getInputElementByName('"+obj.cmp_restrict_flag+"')";

    this.ref_lbl    = obj.ref_label;
    this.cmp_ref_lbl= obj.cmp_ref_label;
    this.notEqual   = obj.duration;
    this.pastDue    = obj.past_due;
    this.show_end_time = obj.show_end_time;
    // define method
    this.check      = Check_EventTime_check_multiple;
}

function Check_EventTime_check_multiple()
{
    var start, end, restr, cmp_restr;
    start = eval(this.start);       // first datetime field
    end   = eval(this.end);         // second datetime field to be compared with first
    restr = eval(this.restrict);    // Restrict checkbox field
    cmp_restr = eval(this.cmp_restrict);  // Restrict checkbox field to compare to
    restr     = (typeof(restr)     != 'undefined') ? restr.checked : true;      // True if restrict checkbox
    cmp_restr = (typeof(cmp_restr) != 'undefined') ? cmp_restr.checked : true;  // is checked or not defined

    // Update time in hidden field
    // Set time to empty string if it is not restricted
    if ( !restr )
    {
        start.value = '';
    }
    if ( !cmp_restr || (this.show_end_time && !restr) )
    {
        end.value   = '';
    } // Second field has to be set also
    start = start.value;
    if ( typeof end != 'undefined' )
    {
        end = end.value;
    }
    // Do not compare fields if at least one checkbox is unchecked
    if ( !restr || !cmp_restr )
    {

        this.notEqual = 0;
    }
    // Do not test for past due if restiction is not applied

    if ( !restr )
    {
        this.pastDue = 0;
    }
    if ( this.pastDue )
    {
        var confirm;
        var start_ms = Date.parse(start.replace(/-/g,'/'));
        if ( start_ms < Date.parse(new Date())-this.pastDue*1000*60 )
        {
            if ( !window.confirm(JS_RESOURCES.getFormattedString('validation.date_past.confirm', [this.ref_lbl])) )
            {
                return false;
            }
        }
    }
    if ( restr && cmp_restr )
    {
        //This block has been aded due to SCR 17696.
        //Reason : if this method is directly called from a JSP page which is not a part of
        // the existing date widgets, and the parameters of stsrt date, end date, start checkbox and
        // end checkbox are passed, and additionally the page has another
        if ( start > end && this.notEqual )
        {
            alert(JS_RESOURCES.getFormattedString('validation.date_past',
                                                  [this.cmp_ref_lbl, this.ref_lbl]));
            return false;
        }
        else if ( end == start && this.notEqual )
        {
            alert(JS_RESOURCES.getFormattedString('validation.date_equal',
                                                  [this.cmp_ref_lbl, this.ref_lbl]));
            return false;
        }
    }
    return true;
}

/*We always need time in our favorite format
*/
function sql_datetime(dat)
{
    var year = dat.getFullYear();
    var mon  = dat.getMonth();
    mon++;                      mon = (mon<10)?'0'+mon:mon;
    var day = dat.getDate();    day = (day<10)?'0'+day:day;
    var hh      = dat.getHours();   hh  = (hh<10)?'0'+hh:hh;
    var mi      = dat.getMinutes(); mi  = (mi<10)?'0'+mi:mi;
    var ss      = dat.getSeconds(); ss  = (ss<10)?'0'+ss:ss;
    return  year+'-'+mon+'-'+day+' '+hh+':'+mi+':'+ss;
}
///////////////////End of object Check_EventTime/////////////



/********************************************************************************
* doubleSubmit.checkDoubleSubmit()
* doubleSubmit.registerFormSubmitEvents(...)
* doubleSubmit.handleFormSubmitEvents(...)
* doubleSubmit.allowSubmitAgainForForm(...) : call to enable submitting the form again / use when you need to submit a form multiple times on a page
* All form submissions should do this validation to avoid double submits.
* All secure form submissions must do this validation to avoid multiple submits
* of the same nonce.
*
* ***** This validation is done automatically on all form submits. *****
* NOTE : Do not overwrite form.onsubmit() function on the form. Instead, call
* doubleSubmit.registerFormSubmitEvents(...) function to add any validation routine that
* you want to add on the page. The callback function should return either true or false;
* Ex)
*   doubleSubmit.registerFormSubmitEvents( formElement, function(event)
*   {
*     // Your validation logic you would have otherwise overwritten form.onsubmit() with
*     return true/false;
*   });
*********************************************************************************/
var doubleSubmit ={};
/*event is null when this function is called programatically by form.submit()
 *so, if you are stopping an event, you need to first check if event is available in the context or not
 *if event is not available, returning false is good enough.
*/
doubleSubmit.checkDoubleSubmit = function ( event, formName )
{
  var currentTime = new Date().getTime();

  if ( !doubleSubmit.submissionFlagLookup )
  {
    // a map-like array (form identifier -> time stamp) to keep track of form submissions
    doubleSubmit.submissionFlagLookup = {};
    doubleSubmit.submissionFlagLookup[ formName ] = currentTime;
    if(event)
    {
      event.returnValue = true;
    }
    return true;
  }

  if ( !doubleSubmit.submissionFlagLookup[ formName ] )
  {
    doubleSubmit.submissionFlagLookup[ formName ] = currentTime;
    if(event)
    {
      event.returnValue = true;
    }
    return true;
  }

  if ( ( currentTime - doubleSubmit.submissionFlagLookup[ formName ] ) < 10000 )
  {
    // we will just ignore subsequent clicks on the submission button for 10 seconds since the first one
  }
  else
  {
    // 10 seconds has passed since the first click on the submission button. yes it's taking longer than optimal but
    // just pop up an alert box saying submission has gone through so be patient and wait!!
    alert( JS_RESOURCES.getString( 'notification.submit' ) );
  }
  if(event)
  {
    event.stop();
  }
  return false;
};

/*event and originalFormOnSubmit are null when this function is called programatically by form.submit()
 *so, if you are stopping an event, you need to first check if event is available in the context or not
 *if event is not available, returning false is good enough.
*/
doubleSubmit.handleFormSubmitEvents = function ( event, form, originalFormOnSubmit )
{
  if(originalFormOnSubmit)
  {
    if(originalFormOnSubmit.call(form) == false)
    {
      if(event)
      {
        event.returnValue = false;
        event.stop();
      }
      return false;
    }
  }
  if (event && event.stopped)
  {
    // in some places, we just stop the event and don't return false on onsubmit call.
    // Besides, if the submit event has been stopped, we need/should not go any further.
    event.returnValue = false;
    return false;
  }

  var i=0;
  if (doubleSubmit.responders)
  {
    while (doubleSubmit.responders[i])
    {
      if (form === doubleSubmit.responders[i].form)
      {
        if(doubleSubmit.responders[i].responder.call(form,event) == false)
        {
          if(event)
          {
            event.returnValue = false;
            if(!event.stopped) //event could have already been stopped in the above responder function call
            {
              event.stop();
            }
          }
          return false;
        }
        if (event && event.stopped)
        {
          // in some places, we just stop the event and don't return false on onsubmit call.
          // Besides, if the submit event has been stopped, we need/should not go any further.
          event.returnValue = false;
          return false;
        }
      }
      i++;
    }
  }
  doubleSubmit._obtainFormNameFromFormIdIfDesirable( form );
  return doubleSubmit.checkDoubleSubmit( event, form.name );
};

doubleSubmit.registerFormSubmitEvents = function ( form, responder )
{
  if ( !doubleSubmit.responders )
  {
    doubleSubmit.responders = {};
  }

  var i=0;
  while ( doubleSubmit.responders[i] )
  {
    i++;
  }
  doubleSubmit.responders[i] = {};
  doubleSubmit.responders[i].form = form;
  doubleSubmit.responders[i].responder = responder;
  return;
};

doubleSubmit.allowSubmitAgainForForm = function ( form )
{
  if ( !doubleSubmit.submissionFlagLookup )
  {
    return;
  }

  form.name = doubleSubmit._obtainFormNameFromFormIdIfDesirable( form );
  delete doubleSubmit.submissionFlagLookup[ form.name ];
  return;
};

doubleSubmit._obtainFormNameFromFormIdIfDesirable = function ( form )
{
  // if name property of the form is not defined or an empty string, then get it from id hoping that it is something more useful
  if(!form.name || form.name === "")
  {
    if(form.id)
    {
      form.name = form.id;
    }
  }
  return form.name;
};
////////////End of namespace doubleSubmit///////////



/********************************************************************************
* Object RadioCheckBox():
* Use this object to make sure that at least one item is selected from the group of
* radio/checkbox groups. Just attach this code to checkbox/radio group (refered below as 'element'):
* formCheckList.addElement(new RadioCheckBox({name:'element or subgroup name',group:'group name',ref_label:"group label in alerts"}));
*********************************************************************************/
var groupAddElement, checkGroupChecked, groupIsChecked;

// Constructor function
function RadioCheckBox(h)
{
    return h;
}

function CheckGroup(h)
{
    this.name       = h.group;
    this.ref_label  = h.ref_label;
    this.elements   = [];
    this.addElement = groupAddElement;
    this.check      = checkGroupChecked;
}

function groupAddElement(h)
{
    this.elements[this.elements.length]   = h.name;
}

function checkGroupChecked()
{
    var list = this.elements;
    var chk  = false;
    for ( var i = 0; i < list.length; i++ )
    {
        if ( groupIsChecked(list[i]) )
        {
            return true;
        }
    }

    var msg = null;
    var group = bbDomUtil.getInputElementByName(list[0]);
    group = (typeof group[0] != 'undefined') ? group[0]:group;

    if ( group.type == "radio" )
    {
        msg = JS_RESOURCES.getFormattedString('validation.radio.required', [this.ref_label]);
    }
    else
    {
        msg = JS_RESOURCES.getFormattedString('validation.option.required', [this.ref_label]);
    }

    alert(msg);
    group.focus();
    return false;
}

function groupIsChecked(groupName)
{
    var group = eval('bbDomUtil.getInputElementByName("'+groupName+'")');
    var checked = false;
    if ( typeof group != 'undefined' )
    {
        if ( group.length  > 1 )
        {
            for ( var i=0;i< group.length; i++ )
            {
                if ( group[i].checked )
                {
                    checked = true;
                    return checked;
                }
            }
        }
        else
        {
            if ( group.checked )
            {
                checked = true;
                return checked;
            }
        }
    }
    return checked;
}
///////////////////End of Object CheckGroup()////////////////////







/********************************************************************************
* Object selector():
* Use this object to make sure that at least one item is available in the Selector element (see PickerElement.java)
* For use when Selector is marked Required:
* formCheckList.addElement(new CheckSelector({name:'element or subgroup name',ref_label:"group label in alerts"}));
*********************************************************************************/
var selectorCheck, selectorElementAvailable;

// Constructor function
function selector(h)
{

    this.element        = 'bbDomUtil.getInputElementByName("'+h.name+'")';
    this.fieldName      = h.name;
    this.ref_label      = h.ref_label;

    this.custom_alert     = h.custom_alert;
    this.custom_alert_cmp = h.custom_alert_cmp;

    this.required       = h.required;
    this.check          = selectorCheck;

    // Add here anything you need to validate
}

// Do actual check here
function selectorCheck()
{
  if(this.required)
  {
    var isAvailable = selectorElementAvailable(this.fieldName);
    this.custom_alert     = (typeof this.custom_alert     != 'undefined') ? this.custom_alert     : '';
    this.ref_label = (typeof this.ref_label != 'undefined') ? this.ref_label
    : JS_RESOURCES.getFormattedString('field_name.substitute', [this.element.name]);
    if ( !isAvailable )
    {
      alert(this.custom_alert ? this.custom_alert
              : JS_RESOURCES.getFormattedString('validation.required', [this.ref_label]));
      return false;
    }
  }
  return true;
}

function selectorElementAvailable(groupName)
{
    // we need at least one "Remove" checkbox to be present and unchecked (one element is added but not removed)
    var group = eval('bbDomUtil.getInputElementByName("'+groupName+'")');
    var available = false;
    if ( typeof group != 'undefined' && group !== null)
    {
        if ( group.length  > 1 )
        {
            for ( var i=0;i< group.length; i++ )
            {
                if ( !group[i].checked )
                {
                    available = true;
                    return available;
                }
            }
        }
        else
        {
            if ( !group.checked )
            {
                available = true;
                return available;
            }
        }
    }
    return available;
}
///////////////////End of Object CheckSelector()////////////////////




//////////////// Start some useful generic functions ////////////


/*  Function ltrim(): Remove leading  spaces in strings:
    Usage:trimmedString = originalString.ltrim();
*/
function ltrim()
{
    return this.replace( /^\s+/g,'');
}
String.prototype.ltrim = ltrim;

/*  Function rtrim(): Remove trailing spaces in strings:
    Usage:trimmedString = originalString.rtrim();
*/
function rtrim()
{
    return this.replace( /\s+$/g,'');
}
String.prototype.rtrim = rtrim;


/*  Function trim(): Remove leading and trailing spaces in strings:
    Usage:trimmedString = originalString.trim();
*/
function trim()
{
    return this.rtrim().ltrim();
}
String.prototype.trim = trim;

/* Function invalidChars(): Returns an array of illegal chars
   Usage: var listOfChars = myStringToSearch.invalidChars(regularExpression);
   regularExpression = /[illegal chars]/g; Sample re = /[! &^$#]/g
*/
function invalidChars (re)
{
    var chrs = this.match(re);
    if ( chrs )
    {
        for ( var j=0;j<chrs.length;j++ )
        {
            if ( chrs[j]===' ' )
            {
                chrs[j]=JS_RESOURCES.getString('invalid_char.space');
            }
            else if ( chrs[j]==',' )
            {
                chrs[j]=JS_RESOURCES.getString('invalid_char.comma');
            }
            else if ( chrs[j]=='\\' )
            {
                chrs[j]='\\\\';
            }
        }
    }
    return chrs;
}
String.prototype.invalidChars = invalidChars;

/** Function getRadioValue(): Returns selected value for group of radio buttons
* Usage: var selectedValue = getRadioValue(radio); radio - reference to radio group
*/
function getRadioValue(radio)
{
    for ( var i=0;i< radio.length;i++ )
    {
        if ( radio[i].checked )
        {
            return radio[i].value;
        }
    }
}

/** Function isEmptyWysiwyg(): Checks WYSIWYG control for value
*/
function isEmptyWysiwyg(field)
{
    // first remove any HTML tags from the value, then check if it's empty (all spaces or &nbsp;s)
    // explicitly adding the unicode non-breaking space and line feed/break since IE and safari
    // don't seem to include them in \s
    var EMPTY_REGEXP = /^(\s|\u00A0|\u2028|\u2029|&nbsp;)*$/i;
   // Input is not empty if it contains one of the following tags: img/object/embed
    var SPECIALTAGS = /(<\s*(img)|(object)|(embed)|(hr)|(input)|(applet))/i;
    if ( field && typeof(field.value) == 'string' && field.value )
    {
        var notags = field.value.replace(/<.*?>/g,'');
        var result = EMPTY_REGEXP.test(notags);

        return  ( result && !SPECIALTAGS.test(field.value) );

    }
    return true;
}

/** Function isValidUrl(): Checks if given string is in the general URL format
*/
var VALID_URL_REGEXP = /[a-z]+:\/\/[^:\/]+(:[0-9]+)?\/?.*/;
function isValidUrl(string)
{
    return( VALID_URL_REGEXP.test(string) );
}

/** Numeric
*/
var EFLOAT_REGEXP = LOCALE_SETTINGS.getString('efloat.format');
var THOUSANDS_SEP = LOCALE_SETTINGS.getString('thousand.sep.format');
/*rejectThousandSep: if true then the presence of the thousands-separator is an error (non-numeric)
 * e.g. we don't accept it for point, since point/score is rarely in thousands range.
 */
function isNumeric(string, rejectThousandSep )
{
    string = string.trim();
    if ( rejectThousandSep !== null && rejectThousandSep )
    {
      var hasThousands = ( string.search( new RegExp( THOUSANDS_SEP ) ) !== -1 ) ;
      if (hasThousands)
      {
        return false;
      }
    }
    string = string.replace(new RegExp(THOUSANDS_SEP, 'g'), '');
    if ( string.search( new RegExp(EFLOAT_REGEXP) ) === 0 )
    {
        var floatValue = parseFloat(string);
        return !isNaN(floatValue);
    }
    return false;
}

/** Float between 0 and 100
*/
var FLOAT_REGEXP = LOCALE_SETTINGS.getString('float.format');
function isPercent(string)
{
    string = string.trim();
    if ( string.search( new RegExp(FLOAT_REGEXP) ) === 0 )
    {
        var floatValue = parseFloat(string);
        return( !isNaN(floatValue)  && floatValue >= 0 && floatValue <= 100 );
    }
    return false;
}

/** Float between -100 and 100
*/
var FLOAT_ALLOW_NEGATIVE_REGEXP = LOCALE_SETTINGS.getString('float.allow.negative.format');
function isValidNegativePercent(string)
{
    string = string.trim();
    if ( string.search( new RegExp(FLOAT_ALLOW_NEGATIVE_REGEXP) ) === 0 )
    {
        var floatValue = parseFloat(string);
        return( !isNaN(floatValue)  && floatValue >= -100 && floatValue <= 100 );
    }
    return false;
}

/*Function submitForm()
  Call this function to validate and submit form
  @param form the name of the form or the DOM object representing the form. If null or undefined, submits first form on page.
*/
function submitForm(form)
{
    if ( validateForm() )
    {
        if (form)
        {
          if ( typeof( form ) == "string" )
          {
              document.forms[ form ].submit();
          }
          else
          {
              form.submit();
          }
        }
        else
        {
          document.forms[0].submit();
        }
    }
}

/* Sort numerical array  in ascending order
*/
function numericalArraySortAscending(a, b)
{
  return (a-b);
}


/*Function validateForm()
* Call this function onSubmit inside <form> tag
*/
function validateForm()
{
    // Set textarea value to VTBE contents
    if ( typeof(finalizeEditors) == "function" )
    {
        finalizeEditors();
    }

    var ismath = window.api ? true : false; // True if webeq is there

    /* Transform equations place holders into html before validation */
    if ( ismath )
    {
        api.setHtml();
    }

    if ( skipValidation )
    {
        return true;
    }

    /* Validate form */
    var valid = formCheckList.check();
    var i;

    /*Check for invalid answers if any present */
    var invalidAnswersArray = [];
    var invAns = window.invalidAnswers;
    if ( typeof( invAns) == 'object' && invAns.length > 0 )
    {
        for ( i = 0; i < invAns.length; ++i )
        {
            invalidAnswersArray.push( invAns[i] );
        }
    }
    invAns = window.invalidAnswersTmp;
    if ( typeof(invAns) == 'object' && invAns.length > 0 )
    {
        for ( i = 0; i < invAns.length; ++i )
        {
            invalidAnswersArray.push( invAns[i] );
        }
    }
    var stringArg = '';
    if ( invalidAnswersArray.length > 0 )
    {
        invalidAnswersArray.sort(numericalArraySortAscending);
        var lastIndex = invalidAnswersArray.length - 1;
        for ( var x = 0; x < invalidAnswersArray.length; x++ )
        {
            stringArg += invalidAnswersArray[x];
            if ( x < lastIndex )
            {
                if ( ( (x+1) % 10 ) === 0 )
                {
                    stringArg += ",\n";
                }
                else
                {
                    stringArg += ",";
                }
            }
        }
    }
    if ( stringArg !== '' && valid )
    {
        var msgKey;
        if ( !assessment.backtrackProhibited )
        {
          msgKey = 'assessment.incomplete.confirm';
        }
        else
        {
          msgKey = 'assessment.incomplete.confirm.backtrackProhibited';
        }
        if (assessment.isSurvey)
        {
          msgKey = msgKey + ".survey";
        }

        if ( !confirm( JS_RESOURCES.getFormattedString( msgKey, [stringArg] ) ) )
        {
            valid = false; // User decided not to submit
        }
        else
        {
          assessment.userReallyWantsToSubmit = true;
        }

        window.invalidAnswersTmp = []; // Clearing up
    }

    /* Go back to placeholders if validation failed (valid == false) */
    if ( ismath && !valid )
    {
        api.setMathmlBoxes();
    }

    return valid;
}

/*Function boxSelector()
* Use this function to select, unselect or invert selection for specified checkbox groups
* Call: boxSelector(['name1','name2',...,'namen'],action), here action is 'select', or 'unselect', or 'invert'
*/
function boxSelector(list,action)
{
    action = (action == 'select') ? true : (action == 'unselect') ? false : action;
    for ( var i=0;i<list.length;i++ )
    {
        var group = 'bbDomUtil.getInputElementByName("'+list[i]+'")';
        if ( typeof (group = eval(group)) != 'undefined' )
        {
            var j;
            if ( action == 'invert' )
            {
                for ( j=0;j<group.length;j++ )
                {
                    group[j].checked = !group[j].checked;
                }
            }
            else
            {
                for ( j=0;j<group.length;j++ )
                {
                    group[j].checked = action;
                }
            }
        }
    }
}


function setHidden (from,to)
{
    var hide = eval(to);
    hide.value = from.value;
}


//////////////////////////////////////////////////////////////////
/**
* Check_Answer object was added by request specified in mscr 524
* to provide validation to student answers
* Variable invalidAnswers has to be added to the page where assessment is submitted
* It should contain the list of unfinished questions excluding  question(s) on current page
* Check_Answer object will perform final validation and display all unfinished questions in confirm box
*/

var invalidAnswers = []; // the java code will populate this array on final QbyQ page
/** Object constructor for answers walidation
*
*/

var Check_Answer_check;

function Check_Answer (vobj)
{
    if ( typeof(window.invalidAnswersTmp)=='undefined' )
    {
        window.invalidAnswersTmp=[];
    }
    this.form       = 'document.forms[0]';
    this.element    = 'bbDomUtil.getInputElementByName("'+vobj.name+'")';
    this.name       = vobj.name;
    this.answerChk  = true; //Check_Answer is special check, it makes a list of unfinished questions and always return true
    this.ref_label  = vobj.ref_label;
    this.check      = Check_Answer_check;
}

//Test if at least one member of radio or checkbox group is selected
function isChecked(grp)
{
  if (typeof(grp.length) != 'undefined')
  {
    for ( var i=0;i< grp.length;i++ )
    {
        if ( grp[i].checked )
        {
            return true;
        }
    }
    return false;
  }
  else
  {
    return grp.checked;
  }
}

function Check_Answer_check()
{

    //create form element object
    var el = eval(this.element);

    //Extract question type information from element name
    var qtype =  /^(\w+)-/.exec(this.name);
    if ( !qtype )
    {
        qtype =  /^([^_]+)_/.exec(this.name);
    }
    qtype = qtype[1];
    if ( qtype == 'ma' )
    {
        qtype = /-\d+$/.test(this.name) ? 'mat' : 'ma';
    }

    // Perform actual check-up
    if ( qtype == 'tf' || qtype == 'mc' || qtype == 'ma' || qtype == 'eo' )
    {
        if ( !isChecked(el) )
        {
            window.invalidAnswersTmp[window.invalidAnswersTmp.length]=this.ref_label;
        }
    }
    else if ( qtype == 'ord' || qtype == 'mat' )
    {
        if ( el.selectedIndex === 0 && this.ref_label != window.invalidAnswersTmp[window.invalidAnswersTmp.length-1] )
        {
            window.invalidAnswersTmp[window.invalidAnswersTmp.length]= this.ref_label;
        }
    }
    else if ( qtype == 'fitb' || qtype == 'essay' || qtype == 'num' || qtype == 'calc' || qtype == 'hs' || qtype == 'jumbled_sentence' || qtype == 'fib_plus' || qtype == 'quiz_bowl' )
    {
        //remove isEmptyWysiwyg for these question types, since they should allow some chars as < >
        var val = el.value;
        if ( isAnEmptyVtbe(val) )
        {
          val='';
        }
        if ( val.trim().length < 1 )
        {
            window.invalidAnswersTmp[window.invalidAnswersTmp.length]= this.ref_label;
        }
        // LRN-LRN-74079 strip all spaces in calculated formula question answers, so numbers can be parsed correctly
        if ( qtype == 'calc' )
        {
          el.value = val.replace(/ /g, "");
        }
    }
    else if ( qtype == 'file' )
    {
        var haveFile = false;

        var hiddenField = eval(this.form + '.elements["' + this.name + '-override"]');
        if ( hiddenField && hiddenField.value == "true" )
        {
            haveFile = true;
        }

        el = eval(this.form + '.elements["' + this.name + '_attachmentType"]');
        if ( !haveFile && el && el.value !== "" )
        {
            haveFile = true;
        }

        if ( !haveFile )
        {
            window.invalidAnswersTmp[window.invalidAnswersTmp.length]= this.ref_label;
        }
    }

    // eliminate duplicates
    // TODO: think of a better way to do this
    if ( window.invalidAnswersTmp.length > 0 )
    {
        var tmpArray = [];
        var tmpObject = {};
        for ( var i = 0; i < window.invalidAnswersTmp.length; ++i )
        {
            if ( !tmpObject[window.invalidAnswersTmp[i]] )
            {
                tmpObject[window.invalidAnswersTmp[i]] = true;
                tmpArray[tmpArray.length] = window.invalidAnswersTmp[i];
            }
        }
        window.invalidAnswersTmp = tmpArray;
    }

    return true; //Always true, we can make decision later through confirm
}

// wrapper function for focus() calls
function shiftFocus(el, isVTBE)
{
    if ( el )
    {
      if ( isVTBE && editors && editors[el.name] && typeof(editors[el.name].focusEditor) == 'function' )
      {
        editors[el.name].focusEditor();
      }
      else if ( !el.disabled && !el.readOnly && el.type != "hidden" )
      {
        safeFocus( el );
      }
    }
    return;
}

function safeFocus( e )
{
  try
  {
    if ( e && e.focus )
    {
      e.focus();
    }
  }
  catch (er)
  {
    //Ignore, element is hidden in IE and can't be focused.
  }
}

/**
 * A validator that checks to see that a certain radio button in a group is
 * selected.  This is intended to be used for conditional validation --
 * validators that only apply when a certain radio button selection is made.
 * Note that if there are no selected values, this validator will return false
 * when checked.
 *   - name - radio button group to check
 *   - value - the radio button value to check for selection
 */
var RadioButtonValueValidator_check;

function RadioButtonValueValidator( name, value )
{
    this.element = bbDomUtil.getInputElementByName(name);
    this.value = value;
    this.check = RadioButtonValueValidator_check;
}

function RadioButtonValueValidator_check()
{
    for ( var i = 0; i < this.element.length; i++ )
    {
        if ( this.element[i].value == this.value )
        {
            return this.element[i].checked;
    }
    }
    return false;
}

/**
 * A validator that performs a logical, short-circuit OR on its two arguments.
 */
var OrValidator_check;

function OrValidator( first, second )
{
    this.first = first;
    this.second = second;
    this.check = OrValidator_check;
}

function OrValidator_check()
{
    return this.first.check() || this.second.check();
}

/* This is a sample code that has to be added to every corresponding form element in take assessment page,
where you perform question validation for completness;
ref_lablel value is used to refer to element, name is field full name:

<script type="text/javascript">
formCheckList.addElement(new Check_Answer({ref_label:"Question 3",name:"tf-ans-_190_1"}));
</script>

*/

var nonceUtil = {};

/**
 * Finds the form element holding the nonceId
 * @param formId is the id of the form the nonce element exists within
 */
nonceUtil.getNonceId = function(formId)
{
  return nonceUtil.getNonceIdEx(formId, 'blackboard.platform.security.NonceUtil.nonce')
};

nonceUtil.getAjaxNonceId = function(formId)
{
  return nonceUtil.getNonceIdEx(formId, 'blackboard.platform.security.NonceUtil.nonce.ajax')
};

nonceUtil.getNonceIdEx = function(formId, elName)
{
  var nonceId = null;
  if(formId && $s(formId) )
  {
    nonceId= $s(formId).elements[elName];
  }
  if( !nonceId )
  {
   // take a cheap shot at retreiving the first nonceId on the page
   nonceId = document.getElementsByName( elName )[0];
  // Note : nonceId can be null if the form does not have a nonce element declared. This should be a sign of a xsrf loophole
  }
  return nonceId;
};

/**
 * Finds the form element holding the nonceId
 * @param formElementId is the id of a form element on the page. It is expected that the nonceId corresponds
 * to the same form.
 */
nonceUtil.getNonceIdByFormElementId = function(formElementId)
{
  var nonceId = null;
  if( formElementId &&  $s(formElementId) )
  {
    var elementFormId = bbDomUtil.getEnclosingForm(formElementId);
    nonceId = $s(elementFormId).elements['blackboard.platform.security.NonceUtil.nonce'];
  }
  return nonceId;
};

nonceUtil.getNonceIdValue = function(formId)
{
  var nonceId = nonceUtil.getNonceId(formId);
  return nonceId ? nonceId.value : "";
};

/**
 * Copies the nonceid from one form on the page to another form.  Useful when using flyout forms.
 */
nonceUtil.copyNonceId = function( sourceFormId, targetFormId )
{
  var nonceId = nonceUtil.getNonceIdValue( sourceFormId );
  var targetElem = new Element( 'input',
                                { type: 'hidden',
                                  name: 'blackboard.platform.security.NonceUtil.nonce',
                                  value: nonceId } );
  $( targetFormId ).appendChild( targetElem );
};

/**
 * Updates the form's nonceId based on the JSON response from an AjaxSecureForm
 */
nonceUtil.updateFromAjaxRequest = function( headerJSON )
{
  if ( headerJSON )
  {
    var nonceId = nonceUtil.getNonceId();
    if( nonceId )
    {
      nonceId.value = headerJSON.nonceId;
    }
  }
};
var NumberLocalizer = Class.create();

NumberLocalizer.prototype =
{
    initialize : function()
    {
      var thousandsSeparator = LOCALE_SETTINGS[ 'number_format.thousands_sep' ];
      var decimalSeparator = LOCALE_SETTINGS[ 'number_format.decimal_point' ];

      this.thousandsSeparator = ( thousandsSeparator === null ) ? ',' : thousandsSeparator;
      this.needToConvertThousands = ( this.thousandsSeparator !== ',' ) ? true : false;

      this.decimalSeparator = ( decimalSeparator === null ) ? '.' : decimalSeparator;
      this.needToConvertDecimal = ( this.decimalSeparator !== '.' ) ? true : false;
    },

    // Takes a number that is unlocalized and converts it to
    // the current locale format.
    formatNumber : function( f )
    {
      var result;
      result = f.toString();

      // Replace and thousands delimiter with a token so we can
      // replace it with the final symbol after we replace the decimal symbol.
      if ( this.needToConvertThousands )
      {
        result = result.replace( ',', '[comma]' );
      }

      if ( this.needToConvertDecimal )
      {
        result = result.replace( '.', this.decimalSeparator );
      }

      if ( this.needToConvertThousands )
      {
        result = result.replace( '[comma]', this.thousandsSeparator );
      }

      return result;
    },

    // Takes a number that is in the current locale format and
    // converts it back to an unlocalized number.
    parseNumber : function( num )
    {
      var result;
      result = num.toString();

      // Parsing string to return as a float, so we don't need the thousands
      // separator anymore.
      result = result.replace( this.thousandsSeparator, '' );

      if ( this.needToConvertDecimal )
      {
        result = result.replace( this.decimalSeparator, '.' );
      }

      return parseFloat( result );
    }
};var AccessibleSelect = {};

/**
 * Wire up the accessible event listeners to any <select>s on the page that have an onchange listener already
 */
AccessibleSelect.initializePage = function()
{
  var selects = document.getElementsByTagName("select");

  for ( var i = 0; i < selects.length; i++ )
  {
    var currentSelect = selects[i];
    if ( currentSelect.onchange )
    {
      currentSelect.changed = false;
      currentSelect.onfocus = AccessibleSelect.onfocus;
      currentSelect.onkeydown = AccessibleSelect.onkeydown;
      currentSelect.onclick = AccessibleSelect.onclick;
      currentSelect.onchange = AccessibleSelect.createOnchange( currentSelect.onchange );
    }
  }
};

/**
 * Functor that creates an onchange function which if the <select> has actually been changed, will call the
 * specified callback (i.e. the original onchange function )
 */
AccessibleSelect.createOnchange = function( callback )
{
  return function( theElement )
  {
    var theSelect;

    if ( theElement && theElement.value )
    {
      theSelect = theElement;
    }
    else
    {
      theSelect = this;
    }

    if (theSelect.changed)
    {
    // bind "theSelect" as the "this" for the callback.
      callback.apply(theSelect);
      return true;
    }
    else
    {
      return false;
    }
  };
};

/**
 * Event listener called when the <select> is clicked
 */
AccessibleSelect.onclick = function()
{
  this.changed = true;

  // If the select size is greater than 0, then the onchange event occurs before the onclick event
  // and the "changed" attribute is false when the onchange event listener method runs and the select
  // element's onchange method does not get called. Therefore, we are going to call it here.
  if( this.size > 0 )
  {
    this.onchange(this);
  }
};

/**
 * Event listener called when the <select> gains focus
 */
AccessibleSelect.onfocus = function()
{
  this.initValue = this.value;
  return true;
};

/**
 * Event listener called when a key is pressed in the <select>.
 */
AccessibleSelect.onkeydown = function(e)
{
  var theEvent;
  var keyCodeTab = "9";
  var keyCodeEnter = "13";
  var keyCodeEsc = "27";

  if (e)
  {
    theEvent = e;
  }
  else
  {
    theEvent = event;
  }

  var largeSize = (this.size > 0);

  if ((theEvent.keyCode == keyCodeEnter || theEvent.keyCode == keyCodeTab) && ( largeSize || this.value != this.initValue) )
  {
    this.initValue = this.value;
    this.changed = true;
    this.onchange(this);
  // returning true logically denotes that the change has been made, but more importantly it will make sure the default
  // behavior (what would have happened without the onkeydown event) is honored. For example, user pressing 'tab' key will
  // move the focus to the next element on the page
  return true;
  }
  else if (theEvent.keyCode == keyCodeEsc)
  {
    this.value = this.initValue;
  return false;
  }
  else
  {
    this.changed = false;
  }

  return true;
};

// This script does not work for Safari. See AS-110404, AS-110426
if (!/webkit|khtml/i.test(navigator.userAgent)) {
  //When the page is loaded, initialize the select boxes
  if ( window.addEventListener) {
    window.addEventListener('load', AccessibleSelect.initializePage, false);
  } else if ( window.attachEvent ) {
    window.attachEvent('onload', AccessibleSelect.initializePage);
  }
}
var popup =
{
  /**
   * Launches a new popup window.  This method is used for an random popup that
   * might be necessary (preview window for example).  If you are launching a
   * "picker" window you should use launchPicker() instead.
   *
   * @param url the url to open the new window using.  This is the first value
   *        passed to window.open().  This is required.
   * @param name the name of the  new window.  This is the second value passed
   *        to window.open().  This is required.
   * @param width the width of the window to launch.  If not provided a default
   *        value will be used.  Do not provide unless your specific requirements
   *        dictate it.
   * @param height the height of the window to launch.  If not provided a default
   *        value will be used.  Do not provide unless your specific requirements
   *        dictate it.
   * @param resizable whether the new window should be resizable.  If not
   *        provided a default value will be used.  Do not provide unless your
   *        specific requirements dictate it.
   * @param showStatus whether the new window should be show the status bar.  If
   *        not provided a default value will be used.  Do not provide unless
   *        your specific requirements dictate it.
   * @param scrolling whether the new window should allow scrolling.  If not
   *        provided a default value will be used.  Do not provide unless your
   *        specific requirements dictate it.
   * @return a reference to the popup window generated
   */
  launch: function( url, name, width, height, resizable, showStatus, scrolling )
  {
    if ( typeof( width ) == 'undefined' )
    {
      // for RTL, the width needs to be wider, to prevent vertical line overlapping in the popup
      if ( page.util.isRTL() )
      {
        width = 1050;
      }
      else
      {
        width = 1050;  // wide enough to prevent a horizontal scrollbar in most cases
      }
    }
    if ( typeof( height ) == 'undefined' )
    {
      height = 500;
    }
    if ( typeof( resizable ) == 'undefined' )
    {
      resizable = 'yes';
    }
    if ( typeof( showStatus ) == 'undefined' )
    {
      showStatus = 'yes';
    }
    if ( typeof( scrolling ) == 'undefined' )
    {
      scrolling = 'yes';
    }

    // figure out placement of the new window we will open.  If the desired size
    // of the new window is bigger than the screen size then make the window
    // smaller and put it far left.  Otherwise, center the window on screen.
    var screenX = 0;
    if ( screen.width <= width )
    {
      width = screen.width;  // new window should not be wider than the screen
    }
    else
    {
      screenX = ( screen.width - width ) / 2;  // center on the screen
    }

    var popup = window.open( url,
                             name,
                             'width=' + width +
                             ',height=' + height +
                             ',resizable=' + resizable +
                             ',scrollbars=' + scrolling +
                             ',status=' + showStatus +
                             ',top=20' +
                             ',screenY=20' +
                             ',screenX=' + screenX +
                             ',left=' + screenX );
    if ( popup )
    {
      popup.focus();
      if ( !popup.opener )
      {
        popup.opener = self;
      }

      window.top.name = 'bbWin';
    }

    return popup;
  },

  /**
   * Launches a new "picker" window.
   * <p>
   * At the moment the only difference between this method and launch (besides
   * the inability to specify some advanced and rarely used options) is that
   * this method will default the {@code name} value if not provided.  However,
   * you should still use this method if you are launching a "picker" type
   * window as additional differences may be introduced in the future.
   *
   * @param url the url to open the new window using.  This is the first value
   *        passed to window.open().  This is required.
   * @param name the name of the  new window.  This is the second value passed
   *        to window.open().  If not provided a default value will be used.
   * @param width the width of the window to launch.  If not provided a default
   *        value will be used.  Do not provide unless your specific requirements
   *        dictate it.
   * @param height the height of the window to launch.  If not provided a default
   *        value will be used.  Do not provide unless your specific requirements
   *        dictate it.
   * @return a reference to the picker window generated
   */
  launchPicker: function( url, name, width, height )
  {
    if ( typeof( name ) == 'undefined' )
    {
      name = 'picker';
    }

    return popup.launch( url, name, width, height );
  }
};
/**
 * Sets a Cookie with the given name and value.
 *
 * name       Name of the cookie
 * value      Value of the cookie
 * [expires]  Expiration date of the cookie (default: end of current session)
 * [path]     Path where the cookie is valid (default: path of calling document)
 * [domain]   Domain where the cookie is valid
 *              (default: domain of calling document)
 * [secure]   Boolean value indicating if the cookie transmission requires a
 *              secure transmission
 */
function setCookie(name, value, expires, path, domain, secure)
{
    document.cookie=name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires.toGMTString() : "") +
        ((path) ? "; path=" + path : "; path=/") +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");
}

function setRootCookie(name, value, expires, path, domain, secure)
{
    document.cookie= name + "=" + escape(value) +
        ((expires) ? "; expires=" + expires.toGMTString() : "") +
        "; path=/" +
        ((domain) ? "; domain=" + domain : "") +
        ((secure) ? "; secure" : "");
}

/**
 * Gets the value of the specified cookie.
 *
 * name  Name of the desired cookie.
 *
 * Returns a string containing value of specified cookie,
 *   or null if cookie does not exist.
 */
function getCookie(name)
{
    var dc = document.cookie;
    var prefix = name + "=";
    var begin = dc.indexOf("; " + prefix);
    if (begin == -1)
    {
        begin = dc.indexOf(prefix);
        if (begin !== 0)
        {
          return null;
        }
    }
    else
    {
        begin += 2;
    }
    var end = document.cookie.indexOf(";", begin);
    if (end == -1)
    {
        end = dc.length;
    }
    return unescape(dc.substring(begin + prefix.length, end));
}

/**
 * Deletes the specified cookie. Will only perform the deletion if
 *
 *   a) The cookie exists in the current path; or
 *   b) The alwaysDelete flag is specified
 *
 * name           name of the cookie
 * [path]         path of the cookie (must be same as path used to create cookie)
 * [domain]       domain of the cookie (must be same as domain used to create cookie)
 * [alwaysDelete] if true, delete the cookie whether it exists in the current path, or not
 */
function deleteCookie(name, path, domain, alwaysDelete)
{
    if (getCookie(name) || alwaysDelete)
    {
        document.cookie = name + "=" +
            ((path) ? "; path=" + path : "") +
            ((domain) ? "; domain=" + domain : "") +
            "; expires=" + new Date(1).toGMTString();
    }
}

// Copyright (c) 2013 Pieroxy <pieroxy@pieroxy.net>
// This work is free. You can redistribute it and/or modify it
// under the terms of the WTFPL, Version 2
// For more information see LICENSE.txt or http://www.wtfpl.net/
//
// For more information, the home page:
// http://pieroxy.net/blog/pages/lz-string/testing.html
//
// LZ-based compression algorithm, version 1.3.3
var LZString = {
  
  
  // private property
  _keyStr : "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",
  _f : String.fromCharCode,
  
  compressToBase64 : function (input) {
    if (input == null) return "";
    var output = "";
    var chr1, chr2, chr3, enc1, enc2, enc3, enc4;
    var i = 0;
    
    input = LZString.compress(input);
    
    while (i < input.length*2) {
      
      if (i%2==0) {
        chr1 = input.charCodeAt(i/2) >> 8;
        chr2 = input.charCodeAt(i/2) & 255;
        if (i/2+1 < input.length) 
          chr3 = input.charCodeAt(i/2+1) >> 8;
        else 
          chr3 = NaN;
      } else {
        chr1 = input.charCodeAt((i-1)/2) & 255;
        if ((i+1)/2 < input.length) {
          chr2 = input.charCodeAt((i+1)/2) >> 8;
          chr3 = input.charCodeAt((i+1)/2) & 255;
        } else 
          chr2=chr3=NaN;
      }
      i+=3;
      
      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;
      
      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      
      output = output +
        LZString._keyStr.charAt(enc1) + LZString._keyStr.charAt(enc2) +
          LZString._keyStr.charAt(enc3) + LZString._keyStr.charAt(enc4);
      
    }
    
    return output;
  },
  
  decompressFromBase64 : function (input) {
    if (input == null) return "";
    var output = "",
        ol = 0, 
        output_,
        chr1, chr2, chr3,
        enc1, enc2, enc3, enc4,
        i = 0, f=LZString._f;
    
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");
    
    while (i < input.length) {
      
      enc1 = LZString._keyStr.indexOf(input.charAt(i++));
      enc2 = LZString._keyStr.indexOf(input.charAt(i++));
      enc3 = LZString._keyStr.indexOf(input.charAt(i++));
      enc4 = LZString._keyStr.indexOf(input.charAt(i++));
      
      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;
      
      if (ol%2==0) {
        output_ = chr1 << 8;
        
        if (enc3 != 64) {
          output += f(output_ | chr2);
        }
        if (enc4 != 64) {
          output_ = chr3 << 8;
        }
      } else {
        output = output + f(output_ | chr1);
        
        if (enc3 != 64) {
          output_ = chr2 << 8;
        }
        if (enc4 != 64) {
          output += f(output_ | chr3);
        }
      }
      ol+=3;
    }
    
    return LZString.decompress(output);
    
  },

  compressToUTF16 : function (input) {
    if (input == null) return "";
    var output = "",
        i,c,
        current,
        status = 0,
        f = LZString._f;
    
    input = LZString.compress(input);
    
    for (i=0 ; i<input.length ; i++) {
      c = input.charCodeAt(i);
      switch (status++) {
        case 0:
          output += f((c >> 1)+32);
          current = (c & 1) << 14;
          break;
        case 1:
          output += f((current + (c >> 2))+32);
          current = (c & 3) << 13;
          break;
        case 2:
          output += f((current + (c >> 3))+32);
          current = (c & 7) << 12;
          break;
        case 3:
          output += f((current + (c >> 4))+32);
          current = (c & 15) << 11;
          break;
        case 4:
          output += f((current + (c >> 5))+32);
          current = (c & 31) << 10;
          break;
        case 5:
          output += f((current + (c >> 6))+32);
          current = (c & 63) << 9;
          break;
        case 6:
          output += f((current + (c >> 7))+32);
          current = (c & 127) << 8;
          break;
        case 7:
          output += f((current + (c >> 8))+32);
          current = (c & 255) << 7;
          break;
        case 8:
          output += f((current + (c >> 9))+32);
          current = (c & 511) << 6;
          break;
        case 9:
          output += f((current + (c >> 10))+32);
          current = (c & 1023) << 5;
          break;
        case 10:
          output += f((current + (c >> 11))+32);
          current = (c & 2047) << 4;
          break;
        case 11:
          output += f((current + (c >> 12))+32);
          current = (c & 4095) << 3;
          break;
        case 12:
          output += f((current + (c >> 13))+32);
          current = (c & 8191) << 2;
          break;
        case 13:
          output += f((current + (c >> 14))+32);
          current = (c & 16383) << 1;
          break;
        case 14:
          output += f((current + (c >> 15))+32, (c & 32767)+32);
          status = 0;
          break;
      }
    }
    
    return output + f(current + 32);
  },
  

  decompressFromUTF16 : function (input) {
    if (input == null) return "";
    var output = "",
        current,c,
        status=0,
        i = 0,
        f = LZString._f;
    
    while (i < input.length) {
      c = input.charCodeAt(i) - 32;
      
      switch (status++) {
        case 0:
          current = c << 1;
          break;
        case 1:
          output += f(current | (c >> 14));
          current = (c&16383) << 2;
          break;
        case 2:
          output += f(current | (c >> 13));
          current = (c&8191) << 3;
          break;
        case 3:
          output += f(current | (c >> 12));
          current = (c&4095) << 4;
          break;
        case 4:
          output += f(current | (c >> 11));
          current = (c&2047) << 5;
          break;
        case 5:
          output += f(current | (c >> 10));
          current = (c&1023) << 6;
          break;
        case 6:
          output += f(current | (c >> 9));
          current = (c&511) << 7;
          break;
        case 7:
          output += f(current | (c >> 8));
          current = (c&255) << 8;
          break;
        case 8:
          output += f(current | (c >> 7));
          current = (c&127) << 9;
          break;
        case 9:
          output += f(current | (c >> 6));
          current = (c&63) << 10;
          break;
        case 10:
          output += f(current | (c >> 5));
          current = (c&31) << 11;
          break;
        case 11:
          output += f(current | (c >> 4));
          current = (c&15) << 12;
          break;
        case 12:
          output += f(current | (c >> 3));
          current = (c&7) << 13;
          break;
        case 13:
          output += f(current | (c >> 2));
          current = (c&3) << 14;
          break;
        case 14:
          output += f(current | (c >> 1));
          current = (c&1) << 15;
          break;
        case 15:
          output += f(current | c);
          status=0;
          break;
      }
      
      
      i++;
    }
    
    return LZString.decompress(output);
    //return output;
    
  },


  
  compress: function (uncompressed) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary= {},
        context_dictionaryToCreate= {},
        context_c="",
        context_wc="",
        context_w="",
        context_enlargeIn= 2, // Compensate for the first entry which should not count
        context_dictSize= 3,
        context_numBits= 2,
        context_data_string="", 
        context_data_val=0, 
        context_data_position=0,
        ii,
        f=LZString._f;
    
    for (ii = 0; ii < uncompressed.length; ii += 1) {
      context_c = uncompressed.charAt(ii);
      if (!Object.prototype.hasOwnProperty.call(context_dictionary,context_c)) {
        context_dictionary[context_c] = context_dictSize++;
        context_dictionaryToCreate[context_c] = true;
      }
      
      context_wc = context_w + context_c;
      if (Object.prototype.hasOwnProperty.call(context_dictionary,context_wc)) {
        context_w = context_wc;
      } else {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
          if (context_w.charCodeAt(0)<256) {
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1);
              if (context_data_position == 15) {
                context_data_position = 0;
                context_data_string += f(context_data_val);
                context_data_val = 0;
              } else {
                context_data_position++;
              }
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<8 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == 15) {
                context_data_position = 0;
                context_data_string += f(context_data_val);
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          } else {
            value = 1;
            for (i=0 ; i<context_numBits ; i++) {
              context_data_val = (context_data_val << 1) | value;
              if (context_data_position == 15) {
                context_data_position = 0;
                context_data_string += f(context_data_val);
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = 0;
            }
            value = context_w.charCodeAt(0);
            for (i=0 ; i<16 ; i++) {
              context_data_val = (context_data_val << 1) | (value&1);
              if (context_data_position == 15) {
                context_data_position = 0;
                context_data_string += f(context_data_val);
                context_data_val = 0;
              } else {
                context_data_position++;
              }
              value = value >> 1;
            }
          }
          context_enlargeIn--;
          if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
          }
          delete context_dictionaryToCreate[context_w];
        } else {
          value = context_dictionary[context_w];
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == 15) {
              context_data_position = 0;
              context_data_string += f(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
          
          
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        // Add wc to the dictionary.
        context_dictionary[context_wc] = context_dictSize++;
        context_w = String(context_c);
      }
    }
    
    // Output the code for w.
    if (context_w !== "") {
      if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate,context_w)) {
        if (context_w.charCodeAt(0)<256) {
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1);
            if (context_data_position == 15) {
              context_data_position = 0;
              context_data_string += f(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<8 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == 15) {
              context_data_position = 0;
              context_data_string += f(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        } else {
          value = 1;
          for (i=0 ; i<context_numBits ; i++) {
            context_data_val = (context_data_val << 1) | value;
            if (context_data_position == 15) {
              context_data_position = 0;
              context_data_string += f(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = 0;
          }
          value = context_w.charCodeAt(0);
          for (i=0 ; i<16 ; i++) {
            context_data_val = (context_data_val << 1) | (value&1);
            if (context_data_position == 15) {
              context_data_position = 0;
              context_data_string += f(context_data_val);
              context_data_val = 0;
            } else {
              context_data_position++;
            }
            value = value >> 1;
          }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
          context_enlargeIn = Math.pow(2, context_numBits);
          context_numBits++;
        }
        delete context_dictionaryToCreate[context_w];
      } else {
        value = context_dictionary[context_w];
        for (i=0 ; i<context_numBits ; i++) {
          context_data_val = (context_data_val << 1) | (value&1);
          if (context_data_position == 15) {
            context_data_position = 0;
            context_data_string += f(context_data_val);
            context_data_val = 0;
          } else {
            context_data_position++;
          }
          value = value >> 1;
        }
        
        
      }
      context_enlargeIn--;
      if (context_enlargeIn == 0) {
        context_enlargeIn = Math.pow(2, context_numBits);
        context_numBits++;
      }
    }
    
    // Mark the end of the stream
    value = 2;
    for (i=0 ; i<context_numBits ; i++) {
      context_data_val = (context_data_val << 1) | (value&1);
      if (context_data_position == 15) {
        context_data_position = 0;
        context_data_string += f(context_data_val);
        context_data_val = 0;
      } else {
        context_data_position++;
      }
      value = value >> 1;
    }
    
    // Flush the last char
    while (true) {
      context_data_val = (context_data_val << 1);
      if (context_data_position == 15) {
        context_data_string += f(context_data_val);
        break;
      }
      else context_data_position++;
    }
    return context_data_string;
  },
  
  decompress: function (compressed) {
    if (compressed == null) return "";
    if (compressed == "") return null;
    var dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = "",
        i,
        w,
        bits, resb, maxpower, power,
        c,
        f = LZString._f,
        data = {string:compressed, val:compressed.charCodeAt(0), position:32768, index:1};
    
    for (i = 0; i < 3; i += 1) {
      dictionary[i] = i;
    }
    
    bits = 0;
    maxpower = Math.pow(2,2);
    power=1;
    while (power!=maxpower) {
      resb = data.val & data.position;
      data.position >>= 1;
      if (data.position == 0) {
        data.position = 32768;
        data.val = data.string.charCodeAt(data.index++);
      }
      bits |= (resb>0 ? 1 : 0) * power;
      power <<= 1;
    }
    
    switch (next = bits) {
      case 0: 
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = 32768;
              data.val = data.string.charCodeAt(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 1: 
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = 32768;
              data.val = data.string.charCodeAt(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
        c = f(bits);
        break;
      case 2: 
        return "";
    }
    dictionary[3] = c;
    w = result = c;
    while (true) {
      if (data.index > data.string.length) {
        return "";
      }
      
      bits = 0;
      maxpower = Math.pow(2,numBits);
      power=1;
      while (power!=maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
          data.position = 32768;
          data.val = data.string.charCodeAt(data.index++);
        }
        bits |= (resb>0 ? 1 : 0) * power;
        power <<= 1;
      }

      switch (c = bits) {
        case 0: 
          bits = 0;
          maxpower = Math.pow(2,8);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = 32768;
              data.val = data.string.charCodeAt(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }

          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 1: 
          bits = 0;
          maxpower = Math.pow(2,16);
          power=1;
          while (power!=maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
              data.position = 32768;
              data.val = data.string.charCodeAt(data.index++);
            }
            bits |= (resb>0 ? 1 : 0) * power;
            power <<= 1;
          }
          dictionary[dictSize++] = f(bits);
          c = dictSize-1;
          enlargeIn--;
          break;
        case 2: 
          return result;
      }
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      
      if (dictionary[c]) {
        entry = dictionary[c];
      } else {
        if (c === dictSize) {
          entry = w + w.charAt(0);
        } else {
          return null;
        }
      }
      result += entry;
      
      // Add w+entry[0] to the dictionary.
      dictionary[dictSize++] = w + entry.charAt(0);
      enlargeIn--;
      
      w = entry;
      
      if (enlargeIn == 0) {
        enlargeIn = Math.pow(2, numBits);
        numBits++;
      }
      
    }
  }
};

if( typeof module !== 'undefined' && module != null ) {
  module.exports = LZString
}
var CLIENT_CACHE_GUID_COOKIE_NAME = 'web_client_cache_guid';

var ClientCache =
{
    LZ_STRING_COMPRESSED_KEY_PREFIX : 'lzsc_',
    DOM_QUOTA_REACHED_EXCEPTION : 22,

    clear : function()
    {
      sessionStorage.clear();
    },

    /**
     * Sets an item to the ClientCache. Uses compression if string representation of the data has 524288 characters or
     * more. Compression is also used if a quota exceeded exception is thrown while setting the data without using
     * compression.
     *
     * @param alwaysCompress store the item compressed
     */
    setItem : function( key, value, alwaysCompress )
    {
      this._validateSession();
      var isCompressedMode = false;
      try
      {
        // sessionStorage.setItem stringify non-string variables anyways. We will do it here to figure out its length
        // below.
        if ( typeof ( value ) !== 'string' )
        {
          value = value.toString();
        }
        // store compressed if larger than .5MB or if the caller explicitly asks for compression
        if ( value.length >= 524288 || alwaysCompress )
        {
          isCompressedMode = true;
          sessionStorage.removeItem( key );
          this._setItemLzStrCompressed( key, value, true );
        }
        else
        {
          sessionStorage.removeItem( this.LZ_STRING_COMPRESSED_KEY_PREFIX + key );
          sessionStorage.setItem( key, value );
        }
      }
      catch ( e )
      {
        if ( !isCompressedMode && this.DOM_QUOTA_REACHED_EXCEPTION === this.getClientCacheException( e ) )
        {
          sessionStorage.removeItem( key );
          this._setItemLzStrCompressed( key, value, true );
        }
        else
        {
          throw e;
        }
      }
    },

    /**
     * @private For internal use only. Please use this.setItem(...) instead. Sets lz-string compressed item to the
     *          ClientCache.
     */
    _setItemLzStrCompressed : function( key, value, skipSessionValidation )
    {
      if ( !skipSessionValidation )
      {
        this._validateSession();
      }
      sessionStorage.setItem( this.LZ_STRING_COMPRESSED_KEY_PREFIX + key, LZString.compressToUTF16( value ) );
    },

    /**
     * @param onlyLookupCompressed gets the item stored compressed and skips altogether checking for non-compressed item
     *          with the key
     */
    getItem : function( key, onlyLookupCompressed )
    {
      this._validateSession();
      var item;
      if ( !onlyLookupCompressed )
      {
        item = sessionStorage.getItem( key );
      }
      if ( !item /* undefined or null */|| onlyLookupCompressed )
      {
        item = this._getItemLzStrCompressed( key, true );
      }
      return item;
    },

    /**
     * @private For internal use only. Please use this.getItem(...) instead. Gets lz-string compressed item from the
     *          ClientCache.
     */
    _getItemLzStrCompressed : function( key, skipSessionValidation )
    {
      if ( !skipSessionValidation )
      {
        this._validateSession();
      }
      var itemTmp = sessionStorage.getItem( this.LZ_STRING_COMPRESSED_KEY_PREFIX + key );
      if ( itemTmp )
      {
        return LZString.decompressFromUTF16( itemTmp );
      }
      return itemTmp;
    },

    removeItem : function( key )
    {
      this._validateSession();
      sessionStorage.removeItem( key );
      sessionStorage.removeItem( this.LZ_STRING_COMPRESSED_KEY_PREFIX + key );
    },

    _validateSession : function()
    {
      var guidCookie = getCookie( CLIENT_CACHE_GUID_COOKIE_NAME );
      if ( guidCookie == null || guidCookie != sessionStorage.getItem( CLIENT_CACHE_GUID_COOKIE_NAME ) )
      {
        sessionStorage.clear();
        if ( guidCookie != null )
        {
          sessionStorage.setItem( CLIENT_CACHE_GUID_COOKIE_NAME, guidCookie );
        }
      }
    },

    getClientCacheException : function( exception )
    {
      if ( !exception )
      {
        return;
      }
      if ( exception.name &&
           ( exception.name === "NS_ERROR_DOM_QUOTA_REACHED" /* FF */|| exception.name === "QUOTA_EXCEEDED_ERR" /* Safari */|| exception.name === "QuotaExceededError" /* Chrome */) )
      {
        // LRN-84254 this is a solution at least to give a more graceful error message from each consumer of the
        // ClientCache mechanism (ex. Grace Center). We may eventually have to come up with a different solution that
        // doen't get limited by the sessionStorage limit imposed by the browsers.
        return this.DOM_QUOTA_REACHED_EXCEPTION;
      };
      return;
    }

};/**
 * globalNavigation.js, resize the navigation div and content div
 **/

var globalNavigation = {};

globalNavigation.init = function()
{
  var quickLinks = $('quick_links_wrap');
  
  if ( self != window.parent )
  {
    // If we have a parent then we're not in the top of the page - while we shouldn't get here in the first
    // place due to proper application logic not showing the globalnav to begin with, if we DO then this is
    // a fallback to remove it from the page.  Currently this logic should only be kicking in when you
    // add 'portfolio homepage' to your course content area and then click through to it and then navigate into
    // various pieces of the portfolio tool - nested pages may not retain the globalNavigation=false
    // parameter and this code handles that case.
    var navArea = $( 'globalNavPageNavArea' );
    if ( navArea )
    {
      var navBarWrap = navArea.up().down( '.global-nav-bar-wrap' );
      if ( navBarWrap )
      {
        navBarWrap.hide();
      }
      navArea.hide();
      if ( quickLinks )
      {
        quickLinks.hide();
      }
      return;
    }
  }
  
  // to set contentDiv height
  globalNavigation.onResize();  

  var navDivHeight = globalNavigation.getNavDivHeight();
  if ( quickLinks  && navDivHeight !== 0 )
  {
    quickLinks.setStyle({ top: (navDivHeight - quickLinks.getHeight()) + 'px'});
  }
};

globalNavigation.getNavDivHeight = function()
{
  return $('globalNavPageNavArea') ? $('globalNavPageNavArea').getHeight() : 0;
};

globalNavigation.setNavDivHeight = function(height)
{
  if (window.self === window.top) {
    $('globalNavPageNavArea').setStyle({height: height + 'px'});
    globalNavigation.onResize();
  }
};

globalNavigation.onResize = function(ev)
{
  var windowHeight = document.viewport.getHeight();
  var navDivHeight = $('globalNavPageNavArea').getHeight();
  var contentDiv = $('globalNavPageContentArea');
  contentDiv.hide();

  if (window.matchMedia("(max-width: 1024px)").matches) {
    if (window.self === window.top) { 
      contentDiv.setStyle({height: (windowHeight - navDivHeight) + 'px'});
    }
  } else {
    contentDiv.setStyle({height: (windowHeight - navDivHeight) + 'px', overflow: 'visible'});
  }

  contentDiv.show();
};

globalNavigation.getContentAreaScrollOffset = function()
{
  var contentDiv = $( 'globalNavPageContentArea' );
  if ( contentDiv )
  {
    var res =
    {
        scrollLeft : contentDiv.scrollLeft,
        scrollTop : contentDiv.scrollTop
    };
    return res;
  }
  else
  {
    var res =
    {
        scrollLeft : 0,
        scrollTop : 0
    };
    return res;
  }
};

globalNavigation.openHelpWindow = function(helpUrl)
{
  var features='width=900, height=675, toolbar=yes, location=yes, menubar=yes, scrollbars=yes, status=yes, resizable=yes';
  newWindow=window.open(helpUrl,'_blank',features);
  if(newWindow != null){
    newWindow.focus();
  }
  return false;
};

globalNavigation.getNoGlobalNavUrl = function(url)
{
  return url + (url.split('?')[1] ? '&':'?') + 'globalNavigation=false';
};

globalNavigation.redirectTopWindow = function()
{
  if(window != top && !page.util.insideUltra() )
  {
    top.location.href = window.location.href.replace('globalNavigation=false', 'globalNavigation=true');
  }
};

globalNavigation.openFullPageFromIframe = function(baseWindow, url)
{
  var par = baseWindow || window;
  var tmp = par.parent;
  while (tmp && tmp != par)
  {
    par = tmp;
    tmp = par.parent;
  }

  if ( baseWindow && baseWindow.page.util.insideUltra() )
  {
    //Ultra is enabled in the opener window.
    var classicCourseIframe = par.document.getElementsByClassName("classic-learn-iframe")[0];
    if ( classicCourseIframe )
    {
      if ( url.startsWith('/') )
      {
        url = document.location.origin + url;
      }
      classicCourseIframe.src = url;
    }
    //TODO: the case of the classic learn iframe not exiting need be handled, i.e. if you navigate away from the course in Ultra but leave the separate window open and then click,
    //the course need be opened then. 
  }
  else
  {
    par.document.location = url;
  }
};var $namespace=function(d,g,b){var f=d.split(g||"."),h=b||window,e,a;for(e=0,a=f.length;e<a;e++){h=h[f[e]]=h[f[e]]||{}}return h};var $type=function(a,b){if(!a instanceof b){throw new SyntaxError()}};if(!$){var $=function(a){return document.getElementById(a)}}if(!Array.prototype.each){Array.prototype.each=function(a){if(typeof a!="function"){throw"Illegal Argument for Array.each"}for(var b=0;b<this.length;b++){a(this[b])}}}if(!Array.prototype.contains){Array.prototype.contains=function(b){var a=false;this.each(function(d){if((b.equals&&b.equals(d))||d==b){a=true;return}});return a}}if(!Array.prototype.containsKey){Array.prototype.containsKey=function(b){for(var a in this){if(a.toLowerCase()==b.toLowerCase()){return true}}return false}}if(!Array.prototype.getCaseInsensitive){Array.prototype.getCaseInsensitive=function(b){for(var a in this){if(a.toLowerCase()==b.toLowerCase()){return this[a]}}return null}}if(!String.prototype.charCodeAt){String.prototype.charCodeAt=function(a){var e=this.charAt(a);for(var b=0;b<65536;b++){var d=String.fromCharCode(b);if(d==e){return b}}return 0}}if(!String.prototype.endsWith){String.prototype.endsWith=function(a){return this.substr((this.length-a.length),a.length)==a}}if(!Exception){var Exception=function(a,b){this.cause=b;this.errorMessage=a};Exception.prototype=Error.prototype;Exception.prototype.getCause=function(){return this.cause};Exception.prototype.getMessage=function(){return this.message};Exception.prototype.getStackTrace=function(){if(this.callstack){return this.callstack}if(this.stack){var b=stack.split("\n");for(var d=0,a=b.length;d<a;d++){if(b[d].match(/^\s*[A-Za-z0-9\=+\$]+\(/)){this.callstack.push(b[d])}}this.callstack.shift();return this.callstack}else{if(window.opera&&this.message){var b=this.message.split("\n");for(var d=0,a=b.length;d<a;d++){if(b[d].match(/^\s*[A-Za-z0-9\=+\$]+\(/)){var f=b[d];if(b[d+1]){f+=" at "+b[d+1];d++}this.callstack.push(f)}}this.callstack.shift();return this.callstack}else{var g=arguments.callee.caller;while(g){var e=g.toString();var h=e.substring(e.indexOf("function")+8,e.indexOf("("))||"anonymous";this.callstack.push(h);g=g.caller}return this.callstack}}};Exception.prototype.printStackTrace=function(b){var a=this.getMessage()+"|||"+this.getStackTrace().join("|||");if(this.cause){if(this.cause.printStackTrace){a+="||||||Caused by "+this.cause.printStackTrace().replace("\n","|||")}}if(!b){return b.replace("|||","\n")}else{if(b.value){b.value=a.replace("|||","\n")}else{if(b.writeln){b.writeln(a.replace("|||","\n"))}else{if(b.innerHTML){b.innerHTML=a.replace("|||","<br/>")}else{if(b.innerText){b.innerText=a.replace("|||","<br/>")}else{if(b.append){b.append(a.replace("|||","\n"))}else{if(b instanceof Function){b(a.replace("|||","\n"))}}}}}}}}}if(!RuntimeException){var RuntimeException=Exception}if(!IllegalArgumentException){var IllegalArgumentException=Exception}if(!DateFormat){var DateFormat=function(d){var b=d;var a={longMonths:["January","February","March","April","May","June","July","August","September","October","November","December"],shortMonths:["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],longDays:["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"],shortDays:["Sun","Mon","Tue","Wed","Thu","Fri","Sat"],d:function(e){return(e.getDate()<10?"0":"")+e.getDate()},D:function(e){return a.shortDays[e.getDay()]},j:function(e){return e.getDate()},l:function(e){return a.longDays[e.getDay()]},N:function(e){return e.getDay()+1},S:function(e){return(e.getDate()%10==1&&e.getDate()!=11?"st":(e.getDate()%10==2&&e.getDate()!=12?"nd":(e.getDate()%10==3&&e.getDate()!=13?"rd":"th")))},w:function(e){return e.getDay()},z:function(e){return"Not Yet Supported"},W:function(e){return"Not Yet Supported"},F:function(e){return a.longMonths[e.getMonth()]},m:function(e){return(e.getMonth()<9?"0":"")+(e.getMonth()+1)},M:function(e){return a.shortMonths[e.getMonth()]},n:function(e){return e.getMonth()+1},t:function(e){return"Not Yet Supported"},L:function(e){return(((e.getFullYear()%4==0)&&(e.getFullYear()%100!=0))||(e.getFullYear()%400==0))?"1":"0"},o:function(e){return"Not Supported"},Y:function(e){return e.getFullYear()},y:function(e){return(""+e.getFullYear()).substr(2)},a:function(e){return e.getHours()<12?"am":"pm"},A:function(e){return e.getHours()<12?"AM":"PM"},B:function(e){return"Not Yet Supported"},g:function(e){return e.getHours()%12||12},G:function(e){return e.getHours()},h:function(e){return((e.getHours()%12||12)<10?"0":"")+(e.getHours()%12||12)},H:function(e){return(e.getHours()<10?"0":"")+e.getHours()},i:function(e){return(e.getMinutes()<10?"0":"")+e.getMinutes()},s:function(e){return(e.getSeconds()<10?"0":"")+e.getSeconds()},e:function(e){return"Not Yet Supported"},I:function(e){return"Not Supported"},O:function(e){return(-e.getTimezoneOffset()<0?"-":"+")+(Math.abs(e.getTimezoneOffset()/60)<10?"0":"")+(Math.abs(e.getTimezoneOffset()/60))+"00"},P:function(e){return(-e.getTimezoneOffset()<0?"-":"+")+(Math.abs(e.getTimezoneOffset()/60)<10?"0":"")+(Math.abs(e.getTimezoneOffset()/60))+":"+(Math.abs(e.getTimezoneOffset()%60)<10?"0":"")+(Math.abs(e.getTimezoneOffset()%60))
},T:function(g){var f=g.getMonth();g.setMonth(0);var e=g.toTimeString().replace(/^.+ \(?([^\)]+)\)?$/,"$1");g.setMonth(f);return e},Z:function(e){return -e.getTimezoneOffset()*60},c:function(e){return e.format("Y-m-d")+"T"+e.format("H:i:sP")},r:function(e){return e.toString()},U:function(e){return e.getTime()/1000}};return{format:function(g){var e="";for(var f=0;f<b.length;f++){var h=b.charAt(f);if(a[h]){e+=a[h].call(g)}else{e+=h}}return e}}};DateFormat.getDateInstance=function(){return new DateFormat("M/d/y h:i a")}}$namespace("org.owasp.esapi");org.owasp.esapi.ESAPI=function(g){var b=g;if(!b){throw new RuntimeException("Configuration Error - Unable to load $ESAPI_Properties Object")}var a=null;var e=null;var d=null;var f=null;var h=null;return{properties:b,encoder:function(){if(!a){if(!b.encoder.Implementation){throw new RuntimeException("Configuration Error - $ESAPI.properties.encoder.Implementation object not found.")}a=new b.encoder.Implementation()}return a},logFactory:function(){if(!d){if(!b.logging.Implementation){throw new RuntimeException("Configuration Error - $ESAPI.properties.logging.Implementation object not found.")}d=new b.logging.Implementation()}return d},logger:function(i){return this.logFactory().getLogger(i)},locale:function(){return org.owasp.esapi.i18n.Locale.getLocale(b.localization.DefaultLocale)},resourceBundle:function(){if(!f){if(!b.localization.StandardResourceBundle){throw new RuntimeException("Configuration Error - $ESAPI.properties.localization.StandardResourceBundle not found.")}f=new org.owasp.esapi.i18n.ObjectResourceBundle(b.localization.StandardResourceBundle)}return f},validator:function(){if(!e){if(!b.validation.Implementation){throw new RuntimeException("Configuration Error - $ESAPI.properties.validation.Implementation object not found.")}e=new b.validation.Implementation()}return e},httpUtilities:function(){if(!h){h=new org.owasp.esapi.HTTPUtilities()}return h}}};var $ESAPI=null;org.owasp.esapi.ESAPI.initialize=function(){$ESAPI=new org.owasp.esapi.ESAPI(Base.esapi.properties)};$namespace("org.owasp.esapi");org.owasp.esapi.Encoder=function(){};$namespace("org.owasp.esapi");org.owasp.esapi.EncoderConstants={CHAR_LOWERS:["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z"],CHAR_UPPERS:["A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],CHAR_DIGITS:["0","1","2","3","4","5","6","7","8","9"],CHAR_SPECIALS:["!","$","*","+","-",".","=","?","@","^","_","|","~"],CHAR_LETTERS:["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z"],CHAR_ALNUM:["a","b","c","d","e","f","g","h","i","j","k","l","m","n","o","p","q","r","s","t","u","v","w","x","y","z","A","B","C","D","E","F","G","H","I","J","K","L","M","N","O","P","Q","R","S","T","U","V","W","X","Y","Z","0","1","2","3","4","5","6","7","8","9"]};$namespace("org.owasp.esapi");org.owasp.esapi.EnterpriseSecurityException=function(b,a,e){var f=a;var d=new Exception(b,e);return{getMessage:d.getMessage,getUserMessage:d.getMessage,getLogMessage:function(){return f},getStackTrace:d.getStackTrace,printStackTrace:d.printStackTrace}};$namespace("org.owasp.esapi");org.owasp.esapi.HTTPUtilities=function(){var b=$ESAPI.logger("HTTPUtilities");var d=$ESAPI.resourceBundle();var a=org.owasp.esapi.Logger.EventType;return{addCookie:function(h){$type(h,org.owasp.esapi.net.Cookie);if(window.top.location.protocol!="http:"||window.top.location.protocol!="https:"){throw new RuntimeException(d.getString("HTTPUtilities.Cookie.Protocol",{protocol:window.top.location.protocol}))}var f=h.getName(),m=h.getValue(),k=h.getMaxAge(),i=h.getDomain(),p=h.getPath(),e=h.getSecure();var n=new org.owasp.esapi.ValidationErrorList();var l=$ESAPI.validator().getValidInput("cookie name",f,"HttpCookieName",50,false,n);var g=$ESAPI.validator().getValidInput("cookie value",m,"HttpCookieValue",5000,false,n);if(n.size()==0){var j=f+"="+escape(m);j+=k?";expires="+(new Date((new Date()).getTime()+(1000*k)).toGMTString()):"";j+=p?";path="+p:"";j+=i?";domain="+i:"";j+=e||$ESAPI.properties.httputilities.cookies.ForceSecure?";secure":"";document.cookie=j}else{b.warning(a.SECURITY_FAILURE,d.getString("HTTPUtilities.Cookie.UnsafeData",{name:f,value:m}))}},getCookie:function(j){var f=document.cookie.split("; ");for(var h=0,e=f.length;h<e;h++){var g=f[h].split("=");if(g[0]==escape(j)){return new org.owasp.esapi.net.Cookie(j,g[1]?unescape(g[1]):"")}}return null},killAllCookies:function(){var f=document.cookie.split("; ");for(var j=0,e=f.length;j<e;j++){var h=f[j].split("=");var g=unescape(h[0]);if(!this.killCookie(g)){throw new RuntimeException(d.getString("HTTPUtilities.Cookie.CantKill",{name:g}))}}},killCookie:function(e){var f=this.getCookie(e);if(f){f.setMaxAge(-10);this.addCookie(f);if(this.getCookie(e)){throw new RuntimeException(d.getString("HTTPUtilities.Cookie.CantKill",{name:e}))
}return true}return false},getRequestParameter:function(f){var e=window.top.location.search.substring(1);var g=e.indexOf(f);if(g<0){return null}g=g+f.length;var h=e.indexOf("&",g);if(h<0){h=e.length}return unescape(e.substring(g,h))}}};$namespace("org.owasp.esapi");org.owasp.esapi.IntrusionException=function(d,b,a){var e=new org.owasp.esapi.EnterpriseSecurityException(d,b,a);return{getMessage:e.getMessage,getUserMessage:e.getMessage,getLogMessage:e.getLogMessage,getStackTrace:e.getStackTrace,printStackTrace:e.printStackTrace}};$namespace("org.owasp.esapi");org.owasp.esapi.LogFactory=function(){return{getLogger:false}};$namespace("org.owasp.esapi");org.owasp.esapi.Logger=function(){return{setLevel:false,fatal:false,error:false,isErrorEnabled:false,warning:false,isWarningEnabled:false,info:false,isInfoEnabled:false,debug:false,isDebugEnabled:false,trace:false,isTraceEnabled:false}};org.owasp.esapi.Logger.EventType=function(d,b){var a=d;var e=b;return{isSuccess:function(){return e},toString:function(){return a}}};with(org.owasp.esapi.Logger){EventType.SECURITY_SUCCESS=new EventType("SECURITY SUCCESS",true);EventType.SECURITY_FAILURE=new EventType("SECURITY FAILURE",false);EventType.EVENT_SUCCESS=new EventType("EVENT SUCCESS",true);EventType.EVENT_FAILURE=new EventType("EVENT FAILURE",false);OFF=Number.MAX_VALUE;FATAL=1000;ERROR=800;WARNING=600;INFO=400;DEBUG=200;TRACE=100;ALL=Number.MIN_VALUE}$namespace("org.owasp.esapi");org.owasp.esapi.PreparedString=function(d,a,g){var f=[];var e=[];function b(k){var h=0,l=0;for(var j=0;j<k.length;j++){if(k.charAt(j)==g){l++;f.push(k.substr(h,j));h=j+1}}f.push(k.substr(h));e=new Array(l)}if(!g){g="?"}b(d);return{set:function(h,j,i){if(h<1||h>e.length){throw new IllegalArgumentException("Attempt to set parameter: "+h+" on a PreparedString with only "+e.length+" placeholders")}if(!i){i=a}e[h-1]=i.encode([],j)},toString:function(){for(var h=0;h<e.length;h++){if(e[h]==null){throw new RuntimeException("Attempt to render PreparedString without setting parameter "+(h+1))}}var j="",k=0;for(var l=0;l<f.length;l++){j+=f[l];if(k<e.length){j+=e[k++]}}return j}}};$namespace("org.owasp.esapi");org.owasp.esapi.ValidationErrorList=function(){var a=Array();return{addError:function(b,d){if(b==null){throw new RuntimeException("Context cannot be null: "+d.getLogMessage(),d)}if(d==null){throw new RuntimeException("Context ("+b+") - Error cannot be null")}if(a[b]){throw new RuntimeException("Context ("+b+") already exists. must be unique.")}a[b]=d},errors:function(){return a},isEmpty:function(){return a.length==0},size:function(){return a.length}}};$namespace("org.owasp.esapi");org.owasp.esapi.ValidationRule=function(){return{getValid:false,setAllowNull:false,getTypeName:false,setTypeName:false,setEncoder:false,assertValid:false,getSafe:false,isValid:false,whitelist:false}};$namespace("org.owasp.esapi");org.owasp.esapi.Validator=function(){return{addRule:false,getRule:false,getValidInput:false,isValidDate:false,getValidDate:false,isValidSafeHTML:false,getValidSafeHTML:false,isValidCreditCard:false,getValidCreditCard:false,isValidFilename:false,getValidFilename:false,isValidNumber:false,getValidNumber:false,isValidPrintable:false,getValidPrintable:false}};$namespace("org.owasp.esapi.codecs.Base64");org.owasp.esapi.codecs.Base64={_keyStr:"ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=",encode:function(h){if(!h){return null}var e="";var d,b,a,m,l,k,j;var f=0;var g=org.owasp.esapi.codecs.UTF8.encode(h);while(f<g.length){d=g.charCodeAt(f++);b=g.charCodeAt(f++);a=g.charCodeAt(f++);m=d>>2;l=((d&3)<<4)|(b>>4);k=((b&15)<<2)|(a>>6);j=a&63;if(isNaN(b)){k=j=64}else{if(isNaN(a)){j=64}}e+=this._keyStr.charAt(m)+this._keyStr.charAt(l)+this._keyStr.charAt(k)+this._keyStr.charAt(j)}return e},decode:function(h){if(!h){return null}var e="";var d,b,a,m,l,k,j;var f=0;var g=h.replace(/[^A-Za-z0-9\+\/\=]/g,"");while(f<g.length){m=this._keyStr.indexOf(g.charAt(f++));l=this._keyStr.indexOf(g.charAt(f++));k=this._keyStr.indexOf(g.charAt(f++));j=this._keyStr.indexOf(g.charAt(f++));d=(m<<2)|(l>>4);b=((l&15)<<4)|(k>>2);a=((k&3)<<6)|j;e+=String.fromCharCode(d);if(k!=64){e+=String.fromCharCode(b)}if(j!=64){e+=String.fromCharCode(a)}}e=org.owasp.esapi.codecs.UTF8.decode(e);return e}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.CSSCodec=function(){var a=new org.owasp.esapi.codecs.Codec();return{encode:a.encode,decode:a.decode,encodeCharacter:function(b,e){if(b.contains(e)){return e}var d=org.owasp.esapi.codecs.Codec.getHexForNonAlphanumeric(e);if(d==null){return e}return"\\"+d+" "},decodeCharacter:function(l){l.mark();var h=l.next();if(h==null){l.reset();return null}if(h!="\\"){l.reset();return null}var d=l.next();if(d==null){l.reset();return null}if(l.isHexDigit(d)){var b=d;for(var f=0;f<6;f++){var k=l.next();if(k==null||k.charCodeAt(0)==32){break}if(l.isHexDigit(k)){b+=k}else{input.pushback(k);break}}try{var j=parseInt(b,16);return String.fromCharCode(j)}catch(g){l.reset();return null}}return d
}}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.Codec=function(){return{encode:function(d,e){var a="";for(var b=0;b<e.length;b++){var f=e.charAt(b);a+=this.encodeCharacter(d,f)}return a},encodeCharacter:function(a,b){return b},decode:function(b){var a="";var d=new org.owasp.esapi.codecs.PushbackString(b);while(d.hasNext()){var e=this.decodeCharacter(d);if(e!=null){a+=e}else{a+=d.next()}}return a},decodeCharacter:function(a){return a.next()}}};org.owasp.esapi.codecs.Codec.getHexForNonAlphanumeric=function(a){if(a.charCodeAt(0)<256){return org.owasp.esapi.codecs.Codec.hex[a.charCodeAt(0)]}return a.charCodeAt(0).toString(16)};org.owasp.esapi.codecs.Codec.hex=[];for(var c=0;c<255;c++){if(c>=48&&c<=57||c>=65&&c<=90||c>=97&&c<=122){org.owasp.esapi.codecs.Codec.hex[c]=null}else{org.owasp.esapi.codecs.Codec.hex[c]=c.toString(16)}}var entityToCharacterMap=[];entityToCharacterMap["&quot"]="34";entityToCharacterMap["&amp"]="38";entityToCharacterMap["&lt"]="60";entityToCharacterMap["&gt"]="62";entityToCharacterMap["&nbsp"]="160";entityToCharacterMap["&iexcl"]="161";entityToCharacterMap["&cent"]="162";entityToCharacterMap["&pound"]="163";entityToCharacterMap["&curren"]="164";entityToCharacterMap["&yen"]="165";entityToCharacterMap["&brvbar"]="166";entityToCharacterMap["&sect"]="167";entityToCharacterMap["&uml"]="168";entityToCharacterMap["&copy"]="169";entityToCharacterMap["&ordf"]="170";entityToCharacterMap["&laquo"]="171";entityToCharacterMap["&not"]="172";entityToCharacterMap["&shy"]="173";entityToCharacterMap["&reg"]="174";entityToCharacterMap["&macr"]="175";entityToCharacterMap["&deg"]="176";entityToCharacterMap["&plusmn"]="177";entityToCharacterMap["&sup2"]="178";entityToCharacterMap["&sup3"]="179";entityToCharacterMap["&acute"]="180";entityToCharacterMap["&micro"]="181";entityToCharacterMap["&para"]="182";entityToCharacterMap["&middot"]="183";entityToCharacterMap["&cedil"]="184";entityToCharacterMap["&sup1"]="185";entityToCharacterMap["&ordm"]="186";entityToCharacterMap["&raquo"]="187";entityToCharacterMap["&frac14"]="188";entityToCharacterMap["&frac12"]="189";entityToCharacterMap["&frac34"]="190";entityToCharacterMap["&iquest"]="191";entityToCharacterMap["&Agrave"]="192";entityToCharacterMap["&Aacute"]="193";entityToCharacterMap["&Acirc"]="194";entityToCharacterMap["&Atilde"]="195";entityToCharacterMap["&Auml"]="196";entityToCharacterMap["&Aring"]="197";entityToCharacterMap["&AElig"]="198";entityToCharacterMap["&Ccedil"]="199";entityToCharacterMap["&Egrave"]="200";entityToCharacterMap["&Eacute"]="201";entityToCharacterMap["&Ecirc"]="202";entityToCharacterMap["&Euml"]="203";entityToCharacterMap["&Igrave"]="204";entityToCharacterMap["&Iacute"]="205";entityToCharacterMap["&Icirc"]="206";entityToCharacterMap["&Iuml"]="207";entityToCharacterMap["&ETH"]="208";entityToCharacterMap["&Ntilde"]="209";entityToCharacterMap["&Ograve"]="210";entityToCharacterMap["&Oacute"]="211";entityToCharacterMap["&Ocirc"]="212";entityToCharacterMap["&Otilde"]="213";entityToCharacterMap["&Ouml"]="214";entityToCharacterMap["&times"]="215";entityToCharacterMap["&Oslash"]="216";entityToCharacterMap["&Ugrave"]="217";entityToCharacterMap["&Uacute"]="218";entityToCharacterMap["&Ucirc"]="219";entityToCharacterMap["&Uuml"]="220";entityToCharacterMap["&Yacute"]="221";entityToCharacterMap["&THORN"]="222";entityToCharacterMap["&szlig"]="223";entityToCharacterMap["&agrave"]="224";entityToCharacterMap["&aacute"]="225";entityToCharacterMap["&acirc"]="226";entityToCharacterMap["&atilde"]="227";entityToCharacterMap["&auml"]="228";entityToCharacterMap["&aring"]="229";entityToCharacterMap["&aelig"]="230";entityToCharacterMap["&ccedil"]="231";entityToCharacterMap["&egrave"]="232";entityToCharacterMap["&eacute"]="233";entityToCharacterMap["&ecirc"]="234";entityToCharacterMap["&euml"]="235";entityToCharacterMap["&igrave"]="236";entityToCharacterMap["&iacute"]="237";entityToCharacterMap["&icirc"]="238";entityToCharacterMap["&iuml"]="239";entityToCharacterMap["&eth"]="240";entityToCharacterMap["&ntilde"]="241";entityToCharacterMap["&ograve"]="242";entityToCharacterMap["&oacute"]="243";entityToCharacterMap["&ocirc"]="244";entityToCharacterMap["&otilde"]="245";entityToCharacterMap["&ouml"]="246";entityToCharacterMap["&divide"]="247";entityToCharacterMap["&oslash"]="248";entityToCharacterMap["&ugrave"]="249";entityToCharacterMap["&uacute"]="250";entityToCharacterMap["&ucirc"]="251";entityToCharacterMap["&uuml"]="252";entityToCharacterMap["&yacute"]="253";entityToCharacterMap["&thorn"]="254";entityToCharacterMap["&yuml"]="255";entityToCharacterMap["&OElig"]="338";entityToCharacterMap["&oelig"]="339";entityToCharacterMap["&Scaron"]="352";entityToCharacterMap["&scaron"]="353";entityToCharacterMap["&Yuml"]="376";entityToCharacterMap["&fnof"]="402";entityToCharacterMap["&circ"]="710";entityToCharacterMap["&tilde"]="732";entityToCharacterMap["&Alpha"]="913";entityToCharacterMap["&Beta"]="914";entityToCharacterMap["&Gamma"]="915";entityToCharacterMap["&Delta"]="916";
entityToCharacterMap["&Epsilon"]="917";entityToCharacterMap["&Zeta"]="918";entityToCharacterMap["&Eta"]="919";entityToCharacterMap["&Theta"]="920";entityToCharacterMap["&Iota"]="921";entityToCharacterMap["&Kappa"]="922";entityToCharacterMap["&Lambda"]="923";entityToCharacterMap["&Mu"]="924";entityToCharacterMap["&Nu"]="925";entityToCharacterMap["&Xi"]="926";entityToCharacterMap["&Omicron"]="927";entityToCharacterMap["&Pi"]="928";entityToCharacterMap["&Rho"]="929";entityToCharacterMap["&Sigma"]="931";entityToCharacterMap["&Tau"]="932";entityToCharacterMap["&Upsilon"]="933";entityToCharacterMap["&Phi"]="934";entityToCharacterMap["&Chi"]="935";entityToCharacterMap["&Psi"]="936";entityToCharacterMap["&Omega"]="937";entityToCharacterMap["&alpha"]="945";entityToCharacterMap["&beta"]="946";entityToCharacterMap["&gamma"]="947";entityToCharacterMap["&delta"]="948";entityToCharacterMap["&epsilon"]="949";entityToCharacterMap["&zeta"]="950";entityToCharacterMap["&eta"]="951";entityToCharacterMap["&theta"]="952";entityToCharacterMap["&iota"]="953";entityToCharacterMap["&kappa"]="954";entityToCharacterMap["&lambda"]="955";entityToCharacterMap["&mu"]="956";entityToCharacterMap["&nu"]="957";entityToCharacterMap["&xi"]="958";entityToCharacterMap["&omicron"]="959";entityToCharacterMap["&pi"]="960";entityToCharacterMap["&rho"]="961";entityToCharacterMap["&sigmaf"]="962";entityToCharacterMap["&sigma"]="963";entityToCharacterMap["&tau"]="964";entityToCharacterMap["&upsilon"]="965";entityToCharacterMap["&phi"]="966";entityToCharacterMap["&chi"]="967";entityToCharacterMap["&psi"]="968";entityToCharacterMap["&omega"]="969";entityToCharacterMap["&thetasym"]="977";entityToCharacterMap["&upsih"]="978";entityToCharacterMap["&piv"]="982";entityToCharacterMap["&ensp"]="8194";entityToCharacterMap["&emsp"]="8195";entityToCharacterMap["&thinsp"]="8201";entityToCharacterMap["&zwnj"]="8204";entityToCharacterMap["&zwj"]="8205";entityToCharacterMap["&lrm"]="8206";entityToCharacterMap["&rlm"]="8207";entityToCharacterMap["&ndash"]="8211";entityToCharacterMap["&mdash"]="8212";entityToCharacterMap["&lsquo"]="8216";entityToCharacterMap["&rsquo"]="8217";entityToCharacterMap["&sbquo"]="8218";entityToCharacterMap["&ldquo"]="8220";entityToCharacterMap["&rdquo"]="8221";entityToCharacterMap["&bdquo"]="8222";entityToCharacterMap["&dagger"]="8224";entityToCharacterMap["&Dagger"]="8225";entityToCharacterMap["&bull"]="8226";entityToCharacterMap["&hellip"]="8230";entityToCharacterMap["&permil"]="8240";entityToCharacterMap["&prime"]="8242";entityToCharacterMap["&Prime"]="8243";entityToCharacterMap["&lsaquo"]="8249";entityToCharacterMap["&rsaquo"]="8250";entityToCharacterMap["&oline"]="8254";entityToCharacterMap["&frasl"]="8260";entityToCharacterMap["&euro"]="8364";entityToCharacterMap["&image"]="8365";entityToCharacterMap["&weierp"]="8472";entityToCharacterMap["&real"]="8476";entityToCharacterMap["&trade"]="8482";entityToCharacterMap["&alefsym"]="8501";entityToCharacterMap["&larr"]="8592";entityToCharacterMap["&uarr"]="8593";entityToCharacterMap["&rarr"]="8594";entityToCharacterMap["&darr"]="8595";entityToCharacterMap["&harr"]="8596";entityToCharacterMap["&crarr"]="8629";entityToCharacterMap["&lArr"]="8656";entityToCharacterMap["&uArr"]="8657";entityToCharacterMap["&rArr"]="8658";entityToCharacterMap["&dArr"]="8659";entityToCharacterMap["&hArr"]="8660";entityToCharacterMap["&forall"]="8704";entityToCharacterMap["&part"]="8706";entityToCharacterMap["&exist"]="8707";entityToCharacterMap["&empty"]="8709";entityToCharacterMap["&nabla"]="8711";entityToCharacterMap["&isin"]="8712";entityToCharacterMap["&notin"]="8713";entityToCharacterMap["&ni"]="8715";entityToCharacterMap["&prod"]="8719";entityToCharacterMap["&sum"]="8721";entityToCharacterMap["&minus"]="8722";entityToCharacterMap["&lowast"]="8727";entityToCharacterMap["&radic"]="8730";entityToCharacterMap["&prop"]="8733";entityToCharacterMap["&infin"]="8734";entityToCharacterMap["&ang"]="8736";entityToCharacterMap["&and"]="8743";entityToCharacterMap["&or"]="8744";entityToCharacterMap["&cap"]="8745";entityToCharacterMap["&cup"]="8746";entityToCharacterMap["&int"]="8747";entityToCharacterMap["&there4"]="8756";entityToCharacterMap["&sim"]="8764";entityToCharacterMap["&cong"]="8773";entityToCharacterMap["&asymp"]="8776";entityToCharacterMap["&ne"]="8800";entityToCharacterMap["&equiv"]="8801";entityToCharacterMap["&le"]="8804";entityToCharacterMap["&ge"]="8805";entityToCharacterMap["&sub"]="8834";entityToCharacterMap["&sup"]="8835";entityToCharacterMap["&nsub"]="8836";entityToCharacterMap["&sube"]="8838";entityToCharacterMap["&supe"]="8839";entityToCharacterMap["&oplus"]="8853";entityToCharacterMap["&otimes"]="8855";entityToCharacterMap["&perp"]="8869";entityToCharacterMap["&sdot"]="8901";entityToCharacterMap["&lceil"]="8968";entityToCharacterMap["&rceil"]="8969";entityToCharacterMap["&lfloor"]="8970";entityToCharacterMap["&rfloor"]="8971";entityToCharacterMap["&lang"]="9001";entityToCharacterMap["&rang"]="9002";entityToCharacterMap["&loz"]="9674";
entityToCharacterMap["&spades"]="9824";entityToCharacterMap["&clubs"]="9827";entityToCharacterMap["&hearts"]="9829";entityToCharacterMap["&diams"]="9830";var characterToEntityMap=[];for(var entity in entityToCharacterMap){characterToEntityMap[entityToCharacterMap[entity]]=entity}$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.HTMLEntityCodec=function(){var f=new org.owasp.esapi.codecs.Codec();var a=function(g){var h=g.peek();if(h==null){return null}if(h=="x"||h=="X"){g.next();return d(g)}return e(g)};var e=function(g){var h="";while(g.hasNext()){var j=g.peek();if(j.match(/[0-9]/)){h+=j;g.next()}else{if(j==";"){g.next();break}else{break}}}try{return parseInt(h)}catch(i){return null}};var d=function(g){var h="";while(g.hasNext()){var j=g.peek();if(j.match(/[0-9A-Fa-f]/)){h+=j;g.next()}else{if(j==";"){g.next();break}else{break}}}try{return parseInt(h,16)}catch(i){return null}};var b=function(h){var g="";while(h.hasNext()){var i=h.peek();if(i.match(/[A-Za-z]/)){g+=i;h.next();if(entityToCharacterMap.containsKey("&"+g)){if(h.peek(";")){h.next()}break}}else{if(i==";"){h.next()}else{break}}}return String.fromCharCode(entityToCharacterMap.getCaseInsensitive("&"+g))};return{encode:f.encode,decode:f.decode,encodeCharacter:function(h,k){if(h.contains(k)){return k}var i=org.owasp.esapi.codecs.Codec.getHexForNonAlphanumeric(k);if(i==null){return k}var j=k.charCodeAt(0);if((j<=31&&k!="\t"&&k!="\n"&&k!="\r")||(j>=127&&j<=159)||k==" "){return" "}var g=characterToEntityMap[j];if(g!=null){return g+";"}return"&#x"+i+";"},decodeCharacter:function(k){var g=k;g.mark();var i=g.next();if(i==null||i!="&"){g.reset();return null}var h=g.next();if(h==null){g.reset();return null}if(h=="#"){var j=a(g);if(j!=null){return j}}else{if(h.match(/[A-Za-z]/)){g.pushback(h);j=b(g);if(j!=null){return j}}}g.reset();return null}}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.JavascriptCodec=function(){var a=new org.owasp.esapi.codecs.Codec();return{encode:function(f,h){var d="";for(var b=0;b<h.length;b++){var g=h.charAt(b);if(f.contains(g)){d+=g}else{var i=org.owasp.esapi.codecs.Codec.getHexForNonAlphanumeric(g);if(i==null){d+=g}else{var e=g.charCodeAt(0).toString(16);if(g.charCodeAt(0)<256){var j="00".substr(e.length);d+="\\x"+j+e.toUpperCase()}else{j="0000".substr(e.length);d+="\\u"+j+e.toUpperCase()}}}}return d},decode:a.decode,decodeCharacter:function(p){p.mark();var k=p.next();if(k==null){p.reset();return null}if(k!="\\"){p.reset();return null}var b=p.next();if(b==null){p.reset();return null}if(b=="b"){return 8}else{if(b=="t"){return 9}else{if(b=="n"){return 10}else{if(b=="v"){return 11}else{if(b=="f"){return 12}else{if(b=="r"){return 13}else{if(b=='"'){return 34}else{if(b=="'"){return 39}else{if(b=="\\"){return 92}else{if(b.toLowerCase()=="x"){h="";for(var j=0;j<2;j++){var m=p.nextHex();if(m!=null){h+=m}else{input.reset();return null}}try{d=parseInt(h,16);return String.fromCharCode(d)}catch(l){p.reset();return null}}else{if(b.toLowerCase()=="u"){h="";for(j=0;j<4;j++){m=p.nextHex();if(m!=null){h+=m}else{input.reset();return null}}try{var d=parseInt(h,16);return String.fromCharCode(d)}catch(l){p.reset();return null}}else{if(p.isOctalDigit(b)){var h=b;var g=p.next();if(!p.isOctalDigit(g)){p.pushback(g)}else{h+=g;var f=p.next();if(!p.isOctalDigit(f)){p.pushback(f)}else{h+=f}}try{d=parseInt(h,8);return String.fromCharCode(d)}catch(l){p.reset();return null}}}}}}}}}}}}}return b}}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.PercentCodec=function(){var e=new org.owasp.esapi.codecs.Codec();var d="abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";var b="-._~";var a=true;var g=d+(a?"":b);var f=function(h){var i="";if(h<-128||h>127){throw new IllegalArgumentException("b is not a byte (was "+h+")")}h&=255;if(h<16){i+="0"}return i+h.toString(16).toUpperCase()};return{encode:e.encode,decode:e.decode,encodeCharacter:function(k,l){if(g.indexOf(l)>-1){return l}var i=org.owasp.esapi.codecs.UTF8.encode(l);var j="";for(var h=0;h<i.length;h++){j+="%"+f(i.charCodeAt(h))}return j},decodeCharacter:function(q){q.mark();var l=q.next();if(l==null||l!="%"){q.reset();return null}var h="";for(var j=0;j<2;j++){var p=q.nextHex();if(p!=null){h+=p}}if(h.length==2){try{var m=parseInt(h,16);return String.fromCharCode(m)}catch(k){}}q.reset();return null}}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.PushbackString=function(b){var e=b,g="",a="",f=0,d=0;return{pushback:function(h){g=h},index:function(){return f},hasNext:function(){if(g!=null){return true}return !(e==null||e.length==0||f>=e.length)},next:function(){if(g!=null){var h=g;g=null;return h}if(e==null||e.length==0||f>=e.length){return null}return e.charAt(f++)},nextHex:function(){var h=this.next();if(this.isHexDigit(h)){return h}return null},nextOctal:function(){var h=this.next();if(this.isOctalDigit(h)){return h}return null},isHexDigit:function(h){return h!=null&&((h>="0"&&h<="9")||(h>="a"&&h<="f")||(h>="A"&&h<="F"))},isOctalDigit:function(h){return h!=null&&(h>="0"&&h<="7")
},peek:function(h){if(!h){if(g!=null){return g}if(e==null||e.length==0||f>=e.length){return null}return e.charAt(f)}else{if(g!=null&&g==h){return true}if(e==null||e.length==0||f>=e.length){return false}return e.charAt(f)==h}},mark:function(){a=g;d=f},reset:function(){g=a;f=d},remainder:function(){var h=e.substr(f);if(g!=null){h=g+h}return h}}};$namespace("org.owasp.esapi.codecs");org.owasp.esapi.codecs.UTF8={encode:function(d){var b=d.replace(/\r\n/g,"\n");var a="";for(var f=0;f<b.length;f++){var e=b.charCodeAt(f);if(e<128){a+=String.fromCharCode(e)}else{if((e>127)&&(e<2048)){a+=String.fromCharCode((e>>6)|192);a+=String.fromCharCode((e&63)|128)}else{a+=String.fromCharCode((e>>12)|224);a+=String.fromCharCode(((e>>6)&63)|128);a+=String.fromCharCode((e&63)|128)}}}return a},decode:function(d){var a="";var b=c=c1=c2=0;while(b<d.length){c=d.charCodeAt(b);if(c<128){a+=String.fromCharCode(c);b++}else{if((c>191)&&(c<224)){c2=d.charCodeAt(b+1);a+=String.fromCharCode(((c&31)<<6)|(c2&63));b+=2}else{c2=utftext.charCodeAt(b+1);c3=utftext.charCodeAt(b+2);string+=String.fromCharCode(((c&15)<<12)|((c2&63)<<6)|(c3&63));b+=3}}}return a}};$namespace("org.owasp.esapi.i18n");org.owasp.esapi.i18n.ArrayResourceBundle=function(sName,oLocale,aMessages,oParent){with(org.owasp.esapi.i18n){var _super=new ResourceBundle(sName,oLocale,oParent)}var messages=aMessages;return{getParent:_super.getParent,getLocale:_super.getLocale,getName:_super.getName,getString:_super.getString,getMessage:function(sKey){return messages[sKey]}}};$namespace("org.owasp.esapi.i18n");org.owasp.esapi.i18n.Locale=function(f,d,a){var g=f,e=d,b=a;return{getLanguage:function(){return g},getCountry:function(){return e},getVariant:function(){return b},toString:function(){return g+(e?"-"+e+(b?"-"+b:""):"")}}};org.owasp.esapi.i18n.Locale.US=new org.owasp.esapi.i18n.Locale("en","US");org.owasp.esapi.i18n.Locale.GB=new org.owasp.esapi.i18n.Locale("en","GB");org.owasp.esapi.i18n.Locale.getLocale=function(b){var a=b.split("-");return new org.owasp.esapi.i18n.Locale(a[0],(a.length>1?a[1]:""),(a.length>2?a.length[2]:""))};org.owasp.esapi.i18n.Locale.getDefault=function(){var a=(navigator.language?navigator.language:(navigator.userLanguage?navigator.userLanguage:"en-US")).split("-");return new org.owasp.esapi.i18n.Locale(a[0],(a.length>1?a[1]:""),(a.length>2?a.length[2]:""))};$namespace("org.owasp.esapi.i18n");org.owasp.esapi.i18n.ObjectResourceBundle=function(e,d){var b=new org.owasp.esapi.i18n.ResourceBundle(e.name,org.owasp.esapi.i18n.Locale.getLocale(e.locale),d);var a=e.messages;return{getParent:b.getParent,getLocale:b.getLocale,getName:b.getName,getString:b.getString,getMessage:function(f){return a[f]}}};$namespace("org.owasp.esapi.i18n");org.owasp.esapi.i18n.ResourceBundle=function(g,e,b){var f=b;var a=e;var d=g;if(!d){throw new SyntaxError("Name required for implementations of org.owasp.esapi.i18n.ResourceBundle")}if(!a){throw new SyntaxError("Locale required for implementations of org.owasp.esapi.i18n.ResourceBundle")}return{getParent:function(){return f},getLocale:function(){return a},getName:function(){return d},getMessage:function(h){return h},getString:function(l,p){if(arguments.length<1){throw new IllegalArgumentException("No key passed to getString")}var m=this.getMessage(l);if(!m){if(f){return f.getString(l,p)}else{return l}}if(!m.match(/\{([A-Za-z]+)\}/)||!p){return m}var h="",n=0;while(true){var j=m.indexOf("{",n);var k=m.indexOf("}",j);if(j<0){h+=m.substr(n,m.length-n);break}if(j>=0&&k<-1){throw new SyntaxError("Invalid Message - Unclosed Context Reference: "+m)}h+=m.substring(n,j);var i=m.substring(j+1,k);if(p[i]){h+=p[i]}else{h+=m.substring(j,k+1)}n=k+1}return h}}};org.owasp.esapi.i18n.ResourceBundle.getResourceBundle=function(sResource,oLocale){var classname=sResource+"_"+oLocale.toString().replace("-","_");with(org.owasp.esapi.i18n){if(ResourceBundle[classname] instanceof Object){return ResourceBundle[classname]}else{return new ResourceBundle[classname]()}}};$namespace("org.owasp.esapi.net");org.owasp.esapi.net.Cookie=function(g,n){var b;var m;var h;var f;var l;var p;var a;var k;var d=$ESAPI.resourceBundle();var i=",; ";var e=function(u){for(var r=0,q=u.length;r<q;r++){var t=u.charCodeAt(r),s=u.charAt(r);if(t<32||t>=127||i.indexOf(s)!=-1){return false}}return true};if(!e(g)||g.toLowerCase()=="comment"||g.toLowerCase()=="discard"||g.toLowerCase()=="domain"||g.toLowerCase()=="expires"||g.toLowerCase()=="max-age"||g.toLowerCase()=="path"||g.toLowerCase()=="secure"||g.toLowerCase()=="version"||g.charAt(0)=="$"){var j=d.getString("Cookie.Name",{name:g});throw new IllegalArgumentException(j)}b=g;m=n;return{setComment:function(q){h=q},getComment:function(){return h},setDomain:function(q){f=q.toLowerCase()},getDomain:function(){return f},setMaxAge:function(q){l=q},getMaxAge:function(){return l},setPath:function(q){p=q},getPath:function(){return p},setSecure:function(q){a=q},getSecure:function(){return a},getName:function(){return b},setValue:function(q){m=q},getValue:function(){return m
},setVersion:function(q){if(q<0||q>1){throw new IllegalArgumentException(d.getString("Cookie.Version",{version:q}))}k=q},getVersion:function(){return k}}};$namespace("org.owasp.esapi.reference.encoding");org.owasp.esapi.reference.encoding.DefaultEncoder=function(a){var h=[],k=new org.owasp.esapi.codecs.HTMLEntityCodec(),f=new org.owasp.esapi.codecs.JavascriptCodec(),g=new org.owasp.esapi.codecs.CSSCodec(),b=new org.owasp.esapi.codecs.PercentCodec();if(!a){h.push(k);h.push(f);h.push(g);h.push(b)}else{h=a}var e=new Array(",",".","-","_"," ");var d=new Array(",",".","-","_");var j=new Array();var i=new Array(",",".","_");return{canonicalize:function(r,m){if(!r){return null}var l=r,p=null,s=1,n=0,q=false;while(!q){q=true;h.each(function(u){var t=l;l=u.decode(l);if(t!=l){if(p!=null&&p!=u){s++}p=u;if(q){n++}q=false}})}if(n>=2&&s>1){if(m){throw new org.owasp.esapi.IntrusionException("Input validation failure","Multiple ("+n+"x) and mixed encoding ("+s+"x) detected in "+r)}}else{if(n>=2){if(m){throw new org.owasp.esapi.IntrusionException("Input validation failure","Multiple ("+n+"x) encoding detected in "+r)}}else{if(s>1){if(m){throw new org.owasp.esapi.IntrusionException("Input validation failure","Mixed ("+s+"x) encoding detected in "+r)}}}}return l},normalize:function(l){return l.replace(/[^\x00-\x7F]/g,"")},encodeForHTML:function(l){return !l?null:k.encode(e,l)},decodeForHTML:function(l){return !l?null:k.decode(l)},encodeForHTMLAttribute:function(l){return !l?null:k.encode(d,l)},encodeForCSS:function(l){return !l?null:g.encode(j,l)},encodeForJavaScript:function(l){return !l?null:f.encode(i,l)},encodeForJavascript:this.encodeForJavaScript,encodeForURL:function(l){return !l?null:escape(l)},decodeFromURL:function(l){return !l?null:unescape(l)},encodeForBase64:function(l){return !l?null:org.owasp.esapi.codecs.Base64.encode(l)},decodeFromBase64:function(l){return !l?null:org.owasp.esapi.codecs.Base64.decode(l)}}};$namespace("org.owasp.esapi.reference.logging");org.owasp.esapi.reference.logging.Log4JSLogFactory=function(){var d=Array();var b=function(m){var f=null;var e=m?m:null;var k=Log4js.Level;var i=false,j=false,l=false,h=$ESAPI.encoder().encodeForHTML;f=Log4js.getLogger(e);var g=function(p){var n=org.owasp.esapi.Logger;switch(p){case n.OFF:return Log4js.Level.OFF;case n.FATAL:return Log4js.Level.FATAL;case n.ERROR:return Log4js.Level.ERROR;case n.WARNING:return Log4js.Level.WARN;case n.INFO:return Log4js.Level.INFO;case n.DEBUG:return Log4js.Level.DEBUG;case n.TRACE:return Log4js.Level.TRACE;case n.ALL:return Log4js.Level.ALL}};return{setLevel:function(n){try{f.setLevel(g(n))}catch(p){this.error(org.owasp.esapi.Logger.SECURITY_FAILURE,"",p)}},trace:function(p,n,q){this.log(k.TRACE,p,n,q)},debug:function(p,n,q){this.log(k.DEBUG,p,n,q)},info:function(p,n,q){this.log(k.INFO,p,n,q)},warning:function(p,n,q){this.log(k.WARN,p,n,q)},error:function(p,n,q){this.log(k.ERROR,p,n,q)},fatal:function(p,n,q){this.log(k.FATAL,p,n,q)},log:function(s,r,p,t){switch(s){case k.TRACE:if(!f.isTraceEnabled()){return}break;case k.DEBUG:if(!f.isDebugEnabled()){return}break;case k.INFO:if(!f.isInfoEnabled()){return}break;case k.WARNING:if(!f.isWarnEnabled()){return}break;case k.ERROR:if(!f.isErrorEnabled()){return}break;case k.FATAL:if(!f.isFatalEnabled()){return}break}if(!p){p=""}p="["+r.toString()+"] - "+p;var n=p.replace("\n","_").replace("\r","_");if(l){n=h(n);if(n!=p){n+=" [Encoded]"}}var q=(i?window.location.href:"")+(j?"/"+$ESAPI.properties.application.Name:"");f.log(s,(q!=""?"["+q+"] ":"")+n,t)},addAppender:function(n){f.addAppender(n)},isLogUrl:function(){return i},setLogUrl:function(n){i=n},isLogApplicationName:function(){return j},setLogApplicationName:function(n){j=n},isEncodingRequired:function(){return l},setEncodingRequired:function(n){l=n},setEncodingFunction:function(n){h=n},isDebugEnabled:function(){return f.isDebugEnabled()},isErrorEnabled:function(){return f.isErrorEnabled()},isFatalEnabled:function(){return f.isFatalEnabled()},isInfoEnabled:function(){return f.isInfoEnabled()},isTraceEnabled:function(){return f.isTraceEnabled()},isWarningEnabled:function(){return f.isWarnEnabled()}}};var a=function(f){var e=$ESAPI.properties.logging;if(e[f]){e=e[f]}return e};return{getLogger:function(g){var h=(typeof g=="string")?g:g.constructor.toString();var f=d[h];if(!f){f=new b(h);var e=a(g);f.setLevel(e.Level);f.setLogUrl(e.LogUrl);f.setLogApplicationName(e.LogApplicationName);f.setEncodingRequired(e.EncodingRequired);if(e.EncodingFunction){f.setEncodingFunction(e.EncodingFunction)}e.Appenders.each(function(i){if(e.Layout){i.setLayout(e.Layout)}f.addAppender(i)});d[h]=f}return f}}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.BaseValidationRule=function(f,h,a){var g=$ESAPI.logger("Validation");var b=org.owasp.esapi.Logger.EventType;var i=f;var j=h?h:$ESAPI.encoder();var l=false;var e=org.owasp.esapi.i18n.ResourceBundle;var k=a?a:$ESAPI.locale();var d;if($ESAPI.properties.validation.ResourceBundle){d=e.getResourceBundle($ESAPI.properties.validation.ResourceBundle,k)
}if(!d){d=$ESAPI.resourceBundle();g.info(b.EVENT_FAILURE,"No Validation ResourceBundle - Defaulting to "+d.getName()+"("+d.getLocale().toString()+")")}g.info(b.EVENT_SUCCESS,"Validation Rule Initialized with ResourceBundle: "+d.getName());return{setAllowNull:function(m){l=m},isAllowNull:function(){return l},getTypeName:function(){return i},setTypeName:function(m){i=m},setEncoder:function(m){j=m},getEncoder:function(){return j},assertValid:function(m,n){this.getValid(m,n)},getValid:function(m,p,r){var q=null;try{q=this.getValidInput(m,p)}catch(n){return this.sanitize(m,p)}return q},getValidInput:function(m,n){return n},getSafe:function(m,p){var q=null;try{q=this.getValidInput(m,p)}catch(n){return this.sanitize(m,p)}return q},sanitize:function(m,n){return n},isValid:function(m,p){var q=false;try{this.getValidInput(m,p);q=true}catch(n){return false}return q},whitelist:function(n,p){var q="";for(var m=0;m<n.length;m++){var r=n.charAt(m);if(p.contains(r)){q+=r}}return q},getUserMessage:function(p,m,n){return this.getMessage(p+".Usr",m+".Usr",n)},getLogMessage:function(p,m,n){return this.getMessage(p+".Log",m+".Log",n)},getMessage:function(p,m,n){return d.getString(p,n)?d.getString(p,n):d.getString(m,n)},validationException:function(p,m,q,n){throw new org.owasp.esapi.reference.validation.ValidationException(this.getUserMessage(p+"."+q,m+"."+q,n),this.getLogMessage(p+"."+q,m+"."+q,n),p)}}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.CreditCardValidationRule=function(b,f,a){var j=new org.owasp.esapi.reference.validation.BaseValidationRule(b,f,a);var h="CreditCard";var d=19;var g;var e=function(){var l=new RegExp($ESAPI.properties.validation.CreditCard);var k=new org.owasp.esapi.reference.validation.StringValidationRule("ccrule",j.getEncoder(),a,l);k.setMaxLength(d);k.setAllowNull(false);return k};ccRule=e();var i=function(k){var s="";var q;for(var n=0;o<k.length;n++){q=k.charAt(n);if(q.match(/[0-9]/)){s+=q}}var p=0,r=0,l=0,t=false;for(var m=s.length-1;m>=0;m--){r=parseInt(s.substring(m,n+1));if(t){l=r*2;if(l>9){l-=9}}else{l=r}p+=l;t=!t}return p%10==0};return{getMaxCardLength:function(){return d},setMaxCardLength:function(k){d=k},setAllowNull:j.setAllowNull,isAllowNull:j.isAllowNull,getTypeName:j.getTypeName,setTypeName:j.setTypeName,setEncoder:j.setEncoder,getEncoder:j.getEncoder,assertValid:j.assertValid,getValid:j.getValid,getValidInput:function(l,m){if(!m||m.trim()==""){if(this.isAllowNull()){return null}j.validationException(l,h,"Required",{context:l,input:m})}var k=g.getValid(l,m);if(!i(k)){j.validationException(l,h,"Invalid",{context:l,input:m})}return k},getSafe:j.getSafe,sanitize:function(k,l){return this.whitelist(l,org.owasp.esapi.EncoderConstants.CHAR_DIGITS)},isValid:j.isValid,whitelist:j.whitelist}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.DateValidationRule=function(a,d,b){var f=new org.owasp.esapi.reference.validation.BaseValidationRule(a,d,b);var h="Date";var g=DateFormat.getDateInstance();var e=function(j,k){if(!j||j.trim()==""){if(f.isAllowNull()){return null}f.validationException(j,h,"Required",{context:j,input:k,format:g})}var i=f.getEncoder().canonicalize(k);try{return g.parse(i)}catch(l){f.validationException(j,h,"Invalid",{context:j,input:k,format:g})}};return{setDateFormat:function(i){if(!i){throw new IllegalArgumentException("DateValidationRule.setDateFormat requires a non-null DateFormat")}g=i},setAllowNull:f.setAllowNull,isAllowNull:f.isAllowNull,getTypeName:f.getTypeName,setTypeName:f.setTypeName,setEncoder:f.setEncoder,getEncoder:f.getEncoder,assertValid:f.assertValid,getValid:f.getValid,getValidInput:function(i,j){return e(i,j)},getSafe:f.getSafe,sanitize:function(i,k){var j=new Date(0);try{j=e(i,k)}catch(l){}return j},isValid:f.isValid,whitelist:f.whitelist}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.DefaultValidator=function(e,b){var g=Array();var d=e?e:$ESAPI.encoder();var a=b?b:org.owasp.esapi.i18n.Locale.getDefault();var f=org.owasp.esapi.reference.validation;return{addRule:function(h){g[h.getName()]=h},getRule:function(h){return g[h]},isValidInput:function(h,k,m,j,i){try{this.getValidInput(h,k,m,j,i);return true}catch(l){return false}},getValidInput:function(i,q,h,l,k,r){var n=new org.owasp.esapi.reference.validation.StringValidationRule(h,d,a);var j=new RegExp($ESAPI.properties.validation[h]);if(j&&j instanceof RegExp){n.addWhitelistPattern(j)}else{throw new IllegalArgumentException("Invalid Type: "+h+" not found.")}n.setMaxLength(l);n.setAllowNull(k);try{return n.getValid(i,q)}catch(m){if(m instanceof j.ValidationErrorList&&r){r.addError(i,m)}throw m}},isValidDate:function(i,k,h,j){try{this.getValidDate(i,k,h,j);return true}catch(l){return false}},getValidDate:function(i,k,h,j,n){var l=new f.DateValidationRule(i,d,a);l.setAllowNull(j);l.setDateFormat(h);try{return l.getValid(i,k)}catch(m){if(m instanceof f.ValidationErrorList&&n){n.addError(i,m)
}throw m}},getValidCreditCard:function(h,j,i,m){var k=new f.CreditCardValidationRule(h,d,a);k.setAllowNull(i);try{return k.getValid(h,j)}catch(l){if(l instanceof f.ValidationErrorList&&m){m.addError(h,l)}throw l}},isValidCreditCard:function(h,j,i){try{this.getValidCreditCard(h,j,i);return true}catch(k){return false}},getValidNumber:function(i,k,j,n,p,m){var h=new f.NumberValidationRule(i,d,a,n,p);h.setAllowNull(j);try{return h.getValid(i,k)}catch(l){if(l instanceof f.ValidationErrorList&&m){m.addError(i,l)}throw l}},isValidNumber:function(h,j,i,l,m){try{this.getValidNumber(h,j,i,l,m);return true}catch(k){return false}},getValidInteger:function(i,k,j,n,p,m){var h=new f.IntegerValidationRule(i,d,a,n,p);h.setAllowNull(j);try{return h.getValid(i,k)}catch(l){if(l instanceof f.ValidationErrorList&&m){m.addError(i,l)}throw l}},isValidInteger:function(h,j,i,l,m){try{this.getValidInteger(h,j,i,l,m);return true}catch(k){return false}}}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.IntegerValidationRule=function(b,e,a,k,h){var j=new org.owasp.esapi.reference.validation.BaseValidationRule(b,e,a);var d="Integer";var i=k?k:Number.MIN_VALUE;var f=h?h:Number.MAX_VALUE;if(i>=f){throw new IllegalArgumentException("minValue must be less than maxValue")}var g=function(m,p){if(!p||p.trim()==""){if(j.allowNull()){return null}j.validationException(m,d,"Required",{context:m,input:p,minValue:i,maxValue:f})}var l=j.getEncoder().canonicalize(p);var q=parseInt(l);if(q=="NaN"){j.validationException(m,d,"NaN",{context:m,input:p,minValue:i,maxValue:f})}if(q<i){j.validationException(m,d,"MinValue",{context:m,input:p,minValue:i,maxValue:f})}if(q>f){j.validationException(m,d,"MaxValue",{context:m,input:p,minValue:i,maxValue:f})}return q};return{setMinValue:function(l){i=l},getMinValue:function(){return i},setMaxValue:function(l){f=l},getMaxValue:function(){return f},setAllowNull:j.setAllowNull,isAllowNull:j.isAllowNull,getTypeName:j.getTypeName,setTypeName:j.setTypeName,setEncoder:j.setEncoder,getEncoder:j.getEncoder,assertValid:j.assertValid,getValid:j.getValid,getValidInput:function(l,m){return g(l,m)},getSafe:j.getSafe,sanitize:function(l,m){var q=0;try{q=g(l,m)}catch(p){}return q},isValid:j.isValid,whitelist:j.whitelist}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.NumberValidationRule=function(b,f,a,h,e){var k=new org.owasp.esapi.reference.validation.BaseValidationRule(b,f,a);var d="Number";var j=h?h:Number.MIN_VALUE;var g=e?e:Number.MAX_VALUE;if(j>=g){throw new IllegalArgumentException("MinValue must be less that MaxValue")}var i=function(m,n){if(!n||n.trim()==""){if(k.isAllowNull()){return null}k.validationException(m,d,"Required",{context:m,input:n,minValue:j,maxValue:g})}var l=k.getEncoder().canonicalize(n);var p=0;try{p=parseFloat(l)}catch(q){k.validationException(m,d,"Invalid",{context:m,input:n,minValue:j,maxValue:g})}if(p=="NaN"){k.validationException(m,d,"NaN",{context:m,input:n,minValue:j,maxValue:g})}if(p<j){k.validationException(m,d,"MinValue",{context:m,input:n,minValue:j,maxValue:g})}if(p>g){k.validationException(m,d,"MaxValue",{context:m,input:n,minValue:j,maxValue:g})}return p};return{setMinValue:function(l){j=l},getMinValue:function(){return j},setMaxValue:function(l){g=l},getMaxValue:function(){return g},setAllowNull:k.setAllowNull,isAllowNull:k.isAllowNull,getTypeName:k.getTypeName,setTypeName:k.setTypeName,setEncoder:k.setEncoder,getEncoder:k.getEncoder,assertValid:k.assertValid,getValid:k.getValid,getValidInput:function(l,m){return i(l,m)},getSafe:k.getSafe,sanitize:function(l,m){var q=0;try{q=i(l,m)}catch(p){}return q},isValid:k.isValid,whitelist:k.whitelist}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.StringValidationRule=function(g,l,a,p){var q=new org.owasp.esapi.reference.validation.BaseValidationRule(g,l,a);var h="String";var n=Array();var f=Array();var e=0;var b=Number.MAX_VALUE;var m=true;if(p){if(p instanceof String){n.push(new RegExp(p))}else{if(p instanceof RegExp){n.push(p)}else{throw new IllegalArgumentException("sWhiteListPattern must be a string containing RegExp or a RegExp Object")}}}var k=function(r,t,s){n.each(function(u){if(t.match(u)){q.validationException(r,h,"Whitelist",{context:r,input:t,orig:s,pattern:u.toString(),minLength:e,maxLength:b,validateInputAndCanonical:m})}})};var j=function(r,t,s){f.each(function(u){if(t.match(u)){q.validationException(r,h,"Blacklist",{context:r,input:t,orig:s,pattern:u.toString(),minLength:e,maxLength:b,validateInputAndCanonical:m})}})};var d=function(r,t,s){if(t.length<e){q.validationException(r,h,"MinLength",{context:r,input:t,orig:s,minLength:e,maxLength:b,validateInputAndCanonical:m})}if(t.length>b){q.validationException(r,h,"MaxLength",{context:r,input:t,orig:s,minLength:e,maxLength:b,validateInputAndCanonical:m})}return t};var i=function(r,t,s){if(!t||t.trim()==""){if(q.isAllowNull()){return null}q.validationException(r,h,"Required",{context:r,input:t,orig:s,minLength:e,maxLength:b,validateInputAndCanonical:m})
}};return{addWhitelistPattern:function(r){if(r instanceof String){n.push(new RegExp(r))}else{if(r instanceof RegExp){n.push(r)}else{throw new IllegalArgumentException("p must be a string containing RegExp or a RegExp Object")}}},addBlacklistPattern:function(r){if(r instanceof String){f.push(new RegExp(r))}else{if(r instanceof RegExp){f.push(r)}else{throw new IllegalArgumentException("p must be a string containing RegExp or a RegExp Object")}}},setMinLength:function(r){e=r},getMinLength:function(){return e},setMaxLength:function(r){b=r},getMaxLength:function(){return b},setValidateInputAndCanonical:function(r){m=r},isValidateInputAndCanonical:function(){return m},setAllowNull:q.setAllowNull,isAllowNull:q.isAllowNull,getTypeName:q.getTypeName,setTypeName:q.setTypeName,setEncoder:q.setEncoder,getEncoder:q.getEncoder,assertValid:q.assertValid,getValid:q.getValid,getValidInput:function(s,t){var r=null;if(i(s,t)==null){return null}if(m){d(s,t);k(s,t);j(s,t)}r=this.getEncoder().canonicalize(t);if(i(s,r,t)==null){return null}d(s,r,t);k(s,r,t);j(s,r,t);return r},getSafe:q.getSafe,sanitize:function(r,s){return this.whitelist(s,org.owasp.esapi.EncoderConstants.CHAR_ALNUM)},isValid:q.isValid,whitelist:q.whitelist}};$namespace("org.owasp.esapi.reference.validation");org.owasp.esapi.reference.validation.ValidationException=function(d,b){var f,a;if(arguments[2]&&arguments[2] instanceof Exception){f=arguments[2];if(arguments[3]&&arguments[3] instanceof String){a=arguments[3]}}else{if(arguments[2]&&arguments[2] instanceof String){a=arguments[2]}}var e=new org.owasp.esapi.EnterpriseSecurityException(d,b,f);return{setContext:function(g){a=g},getContext:function(){return a},getMessage:e.getMessage,getUserMessage:e.getMessage,getLogMessage:e.getLogMessage,getStackTrace:e.getStackTrace,printStackTrace:e.printStackTrace}};var ESAPI_Standard_en_US = {
    name: 'ESAPI Standard Messages - US English',
    locale: 'en-US',
    messages: {
        "Test"                              : "This is test #{testnumber}",

        // Messages for validation
        "CreditCard.Required.Usr"           : "{context}: Input credit card required",
        "CreditCard.Required.Log"           : "Input credit card required: context={context}, input={input}",
        "CreditCard.Invalid.Usr"            : "{context}: Invalid credit card input",
        "CreditCard.Invalid.Log"            : "Invalid credit card input: context={context}, input={input}",
        "Date.Required.Usr"                 : "{context}: Input date required in {format} format",
        "Date.Required.Log"                 : "Date required: context={context}, input={input}, format={format}",
        "Date.Invalid.Usr"                  : "{context}: Invalid date, please use {format} format",
        "Date.Invalid.Log"                  : "Invalid date: context={context}, input={input}, format={format}",
        "Integer.Required.Usr"              : "{context}: Input number required",
        "Integer.Required.Log"              : "Input number required: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Integer.NaN.Usr"                   : "{context}: Invalid number",
        "Integer.NaN.Log"                   : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Integer.MinValue.Usr"              : "{context}: Invalid number - Must be greater than {minValue}",
        "Integer.MinValue.Log"              : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Integer.MaxValue.Usr"              : "{context}: Invalid number - Must be less than {maxValue}",
        "Integer.MaxValue.Log"              : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Number.Required.Usr"               : "{context}: Input number required",
        "Number.Required.Log"               : "Input number required: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Number.NaN.Usr"                    : "{context}: Invalid number",
        "Number.NaN.Log"                    : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Number.MinValue.Usr"               : "{context}: Invalid number - Must be greater than {minValue}",
        "Number.MinValue.Log"               : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "Number.MaxValue.Usr"               : "{context}: Invalid number - Must be less than {maxValue}",
        "Number.MaxValue.Log"               : "Invalid number: context={context}, input={input}, minValue={minValue}, maxValue={maxValue}",
        "String.Required.Usr"               : "{context}: Input required",
        "String.Required.Log"               : "Input required: context={context}, input={input}, original={orig}",
        "String.Whitelist.Usr"              : "{context}: Invalid input - Conform to regex {pattern}",
        "String.Whitelist.Log"              : "Invalid input - Whitelist validation failed: context={context}, input={input}, original={orig}, pattern={pattern}",
        "String.Blacklist.Usr"              : "{context}: Invalid input - Dangerous input matching {pattern} detected",
        "String.Blacklist.Log"              : "Invalid input - Blacklist validation failed: context={context}, input={input}, original={orig}, pattern={pattern}",
        "String.MinLength.Usr"              : "{context}: Invalid input - Minimum length is {minLength}",
        "String.MinLength.Log"              : "Invalid input - Too short: context={context}, input={input}, original={orig}, minLength={minLength}",
        "String.MaxLength.Usr"              : "{context}: Invalid input - Maximum length is {maxLength}",
        "String.MaxLength.Log"              : "Invalid input - Too long: context={context}, input={input}, original={orig}, maxLength={maxLength}",

        // Error Messages for Exceptions
        "HTTPUtilities.Cookie.Protocol"     : "Cookies disallowed on non http[s] requests. Current protocol: {protocol}",
        "HTTPUtilities.Cookie.UnsafeData"   : "Attempt to add unsafe data to cookie (skip mode) - Cookie: {name}={value}",
        "HTTPUtilities.Cookie.CantKill"     : "Unable to kill cookie named {name}",
        "Cookie.Name"                       : "Cookie name \"{name}\" is a reserved token",
        "Cookie.Version"                    : "Cookie version \"{version}\" is not a valid version. Version must be 0 or 1."
    }
};/*
 * OWASP Enterprise Security API (ESAPI)
 *
 * This file is part of the Open Web Application Security Project (OWASP)
 * Enterprise Security API (ESAPI) project. For details, please see
 * <a href="http://www.owasp.org/index.php/ESAPI">http://www.owasp.org/index.php/ESAPI</a>.
 *
 * Copyright (c) 2008 - The OWASP Foundation
 *
 * The ESAPI is published by OWASP under the BSD license. You should read and accept the
 * LICENSE before you use, modify, and/or redistribute this software.
 */

$namespace('Base.esapi.properties');

Base.esapi.properties = {
    application: {
        // Change this value to reflect your application, or override it in an application scoped configuration.
        Name: 'ESAPI4JS Base Application'
    },

    httputilities: {
        cookies: {
            ForceSecure: true
        }
    },

    logging: {
        Implementation: org.owasp.esapi.reference.logging.Log4JSLogFactory,
        Level: org.owasp.esapi.Logger.ERROR,
        // For a console that pops up in a seperate window
        // Appenders: [ new ConsoleAppender(true) ],
        // To log to a logging service on the server
        // Appenders: [ new AjaxAppender( '/log/' ) ],
        // Default to log nowhere
        Appenders: [  ],
        LogUrl: false,
        LogApplicationName: false,
        EncodingRequired: true
    },

    encoder: {
        Implementation: org.owasp.esapi.reference.encoding.DefaultEncoder,
        AllowMultipleEncoding: false
    },

    localization: {
        StandardResourceBundle: ESAPI_Standard_en_US,
        DefaultLocale: 'en-US'
    },

    validation: {
        Implementation: org.owasp.esapi.reference.validation.DefaultValidator,
        AccountName: '^[a-zA-Z0-9]{3,20}$',
        SafeString: '[a-zA-Z0-9\\-_+]*',
        Email: '^[A-Za-z0-9._%-]+@[A-Za-z0-9.-]+\\.[a-zA-Z]{2,4}$',
        IPAddress: '^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$',
        URL: '^(ht|f)tp(s?)\\:\\/\\/[0-9a-zA-Z]([-.\\w]*[0-9a-zA-Z])*(:(0-9)*)*(\\/?)([a-zA-Z0-9\\-\\.\\?\\,\\:\\\'\\/\\\\\\+=&amp;%\\$#_]*)?$',
        CreditCard: '^(\\d{4}[- ]?){3}\\d{4}$',
        SSN: '^(?!000)([0-6]\\d{2}|7([0-6]\\d|7[012]))([ -]?)(?!00)\\d\\d\\3(?!0000)\\d{4}$',
        HttpScheme: '^(http|https)$',
        HttpServerName: '^[a-zA-Z0-9_.\\-]*$',
        HttpParameterName: '^[a-zA-Z0-9_]{1,32}$',
        HttpParameterValue: '^[a-zA-Z0-9.\\-\\/+=_ ]*$',
        HttpCookieName: '^[a-zA-Z0-9\\-_]{1,32}$',
        HttpCookieValue: '^[a-zA-Z0-9\\-\\/+=_ ]*$'
    }
};var BrowserSpecific =
{
  registerListeners: function()
  {
    if( Prototype.Browser.IE )
    {
      var inputs = $A(document.getElementsByTagName('input'));
       //Enter key submit handling added only for IE browser.
      if( inputs )
      {
        inputs.each(
                      function( input )
                      {
                        if(input.type === 'text' && !page.util.hasClassName(input,'noFormSubmitIE'))
                        {
                          Event.observe( input, "keypress",
                                         this.checkEnterKeyToSubmit.bindAsEventListener( this, input )
                                        );
                        }
                      }.bind( this )
                   );
      }
   }
 },
 checkEnterKeyToSubmit: function(event, input)
 {
   //if generated character code is equal to ascii 13 (if enter key)
   if(event.keyCode == 13 && input.form)
   {
     var submitButtons = $(input.form).getInputs('submit');
     if(submitButtons && submitButtons.size() > 0)
     {
       submitButtons.first().click();
     }
     Event.stop(event);
   }
   else
   {
     return true;
   }
 },
 // Fix FireFox bug which converts absolute links pasted into a VTBE into relative ones which
 // start with a variable number of "../".
 // https://bugzilla.mozilla.org/show_bug.cgi?id=613517
 handleFirefoxPastedLinksBug: function( baseUrl, vtbeText )
 {
   if ( !baseUrl || !vtbeText )
   {
     return vtbeText;	
   }

   if ( Prototype.Browser.Gecko )
   {
     if( !$( baseUrl.empty() ) && !$( vtbeText.empty() ) )
     {
       //e.g. extract out "http://localhost:80" from "http://localhost:80/webapps/Bb-wiki-BBLEARN/"
       // port is optional
       var absoluteUrlPrefix = baseUrl.match(/https?:[\d]*\/\/[^\/]+/);
       // e.g."../../../bbcswebdav/xid-2202_1" into "http://localhost:80/bbcswebdav/xid-2202_1"
       vtbeText = vtbeText.replace(/(\.\.\/)+(sessions|bbcswebdav|courses|@@)/g, absoluteUrlPrefix + "/" + "$2");
     }
   }
   return vtbeText;
 },

  disableEnterKeyInTextBoxes: function (document)
  {
    var inputs = $A(document.getElementsByTagName('input'));
    if( inputs )
    {
      inputs.each
      (
        function( input )
        { //must add special className for IE textboxes
          if( Prototype.Browser.IE )
          {
            input.addClassName( 'noFormSubmitIE' );
          }
          Event.observe( input, 'keypress', this.disableEnterKey );
        }.bind( this )
      );
    }
  },

  disableEnterKey: function( event )
  {
    if( event.keyCode != Event.KEY_RETURN )
    {
      return;
    }
    Event.stop( event );
    return;
  }
};
if(!window.lightbox)
{
/**
 * lightbox.js - a flexible lightbox widget.
 * @author jriecken
 **/
var lightbox = {
  Lightbox: Class.create({
   /**
    * Creates a new lightbox.  If no "openLink" property exists in the config passed in,
    * the lb can be programmatically opened by calling open() on it.
    * @param cfg configuration for the lb.
    *  - lightboxId - The optional id to be set to the lightbox wrapping div. The default is no id attribute set on the lightbox wrapper element.
    *  - openLink - If passed will wire lb opening to this link, and set the focus back on it on close
    *  - focusOnClose - element that will receive the focus on close. If specified, it supercedes openLink element.
    *  - ajax - Whether to asyncronously load the lb content. This can be a simple boolean (the url will be taken from openLink's href) or a {url: 'url', params: 'params', loadExternalScripts: 'true'} object.
    *  --    if ajax{...loadExternalScripts :true} is defined then all all of the referenced script source files will be loaded before executing the scripts in the loaded page.
    *  - dimensions - A {w: xxx, h: xxx} object defining the dimensions of the lb.  If not passed, the lb will size to fit the content.
    *  - contents - Contents of the lb (not needed if async) - either a string, a function that returns a string, or an object with add'l config (see _updateLightboxContent).
    *  - title - Title for the lb.  If not passed and openLink is provided and has a title attribute, that attribute will be used.
    *  - defaultDimensions - Default dimensions for ajax loading phase of a lb that doesn't specify a dimensions config param.
    *  - useDefaultDimensionsAsMinimumSize - if useDefaultDimensionsAsMinimumSize set then increase size to be the minimum if the auto-size results in a small size
    *  - horizontalBorder - specifies the minimum dimension for the width around the lightbox, default is set to 50
    *  - verticalBorder - specifies the minimum dimension for the height around the lightbox, default is set to 50
    *  - constrainToWindow - Whether to ensure that the lb will fit inside the window.
    *  - closeOnBodyClick - Whether to close the lb when the user clicks outside of the lb.
    *  - processingTemplate - HTML template for the content shown while an async load is in progress.
    *  - lbTemplate - HTML template for the lb. If user-supplied lbTemplate & title parameters are passed to the lightbox, the lbTemplate must contain any required  headings for the title.
    *  - lbContentClass - div class that contains the lb content, useful with client-supplied lbTemplate.
    *  - troubleElems - Elements that should be hidden while the lb is open.
    *  - msgs - I18N messages used by the lb.
    *  - onClose - call back function that if passed is called when the light box is closed
    *  - left - optional left position for lb. Default position is centered
    *  - top - optional top position for lb. Default position is centered
    **/
   initialize: function( cfg )
   {
     //Default values for configuration parameters.
     this.cfg = Object.extend({
        lightboxId: "",
        openLink: null,
        ajax: null,
        dimensions: null,
        contents: "",
        title: "",
        focusOnClose: "",
        defaultDimensions: { w: 320, h: 240 },
        useDefaultDimensionsAsMinimumSize : false,
        horizontalBorder : 50,
        verticalBorder : 50,
        constrainToWindow: true,
        closeOnBodyClick: true,
        showCloseLink: true,
        processingTemplate: '<div class="lb-loading" style="width: #{width}px; height: #{height}px;"><span class="hideoff">#{loadingText}</span></div>',
        lbTemplate: '<div class="lb-header" tabindex="0" id="lb-header">#{title}</div><div class="lb-content" aria-live="assertive"></div><a class="lbAction u_floatThis-right" href="\\#close" title=\'#{closeText}\'><img src="' + getCdnURL( "/images/ci/mybb/x_btn.png" ) + '" alt="#{closeText}"></a>',
        lbContentClass: 'lb-content',
        troubleElems: [ 'select', 'object', 'embed', 'applet' ],
        msgs: { 'close' : page.bundle.getString('inlineconfirmation.close'), 'loading' : page.bundle.getString('lightbox.loading') }
     }, cfg);
     if ( !this.cfg.showCloseLink && !cfg.lbTemplate )
     {
       this.cfg.lbTemplate = '<div class="lb-header" tabindex="0" id="lb-header">#{title}</div><div class="lb-content" aria-live="assertive"></div><span tabindex="0" class="lb-focustrap"> </span>';
     }
     this.cfg.title = this.cfg.title || ( this.cfg.openLink && this.cfg.openLink.title ? this.cfg.openLink.title : "" );
     var wrapperArgs = {
       title: this.cfg.title,
       closeText: this.cfg.msgs.close,
       lbContentClass: this.cfg.lbContentClass
     };
     if ( wrapperArgs.title )
     {
       if ( !cfg.lbTemplate )
       {
           wrapperArgs.title = '<h2 aria-live="assertive">' + wrapperArgs.title + '</h2>';
       }
     }
     else
     {
       wrapperArgs.title = '&nbsp;';
     }

     if ( this.cfg.openLink )
     {
       this.cfg.openLink = $( this.cfg.openLink );
       this.cfg.openLink.observe( 'click', this._onOpen.bindAsEventListener( this ) );
       if ( !this.cfg.focusOnClose )
       {
         this.cfg.focusOnClose = this.cfg.openLink;
       }
     }
     this.overlay = new Element('div').addClassName('lb-overlay').setStyle( { opacity: 0 } );
     this.lightboxWrapper = new Element('div').addClassName('lb-wrapper').update( this.cfg.lbTemplate.interpolate( wrapperArgs ) );
     if ( this.cfg.lightboxId )
     {
       this.lightboxWrapper.setAttribute( 'id', this.cfg.lightboxId );
     }

     var header = this.lightboxWrapper.down('.lb-header');
     if ( header )
     {
       this.lightboxTitle = header.down('h2');
     }

     this.lightboxContent = this.lightboxWrapper.down('div.' + this.cfg.lbContentClass);
     this.firstLink = this.lightboxWrapper.down('.lb-header');
     if ( this.cfg.showCloseLink )
     {
       this.closeLink = this.lastLink = this.lightboxWrapper.down('.lbAction');
       this.closeLink.observe( 'click', this._onClose.bindAsEventListener( this ) );
     }
     else
     {
       this.lastLink = this.lightboxWrapper.down('.lb-focustrap');
       if ( !this.lastLink )
       {
         this.lastLink = this.firstLink;
       }
     }
     //Wire up events
     this.lightboxWrapper.observe( 'keydown', this._onKeyPress.bindAsEventListener( this ) );
     if ( this.cfg.closeOnBodyClick )
     {
       this.overlay.observe( 'click', this._onOverlayClick.bindAsEventListener( this ) );
     }
     this.boundResizeListener = this._onWindowResize.bindAsEventListener( this );
   },
   /**
    * Opens the lightbox.
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   open: function( afterOpen )
   {
     lightbox.closeCurrentLightbox();
     lightbox._currentLightbox = this;
     this._fixIE( true );
     this._toggleTroubleElements( true );

     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         document.body.appendChild( this.lightboxWrapper );
         this._updateLightboxContent( afterOpen );
         //Calling the youtube API Method when the light box is loaded
         var lbc1 = this.lightboxContent;
         var frameIds = lbc1.getElementsByClassName("ytIframeClass");
         if ( frameIds.length > 0 ) {
           var frameIdss = [];
           frameIdss.push( frameIds[0] );
           
         }
         Event.observe( window, 'resize', this.boundResizeListener );
       }.bind( this ) });
   },
   /**
    * Shows the existing the lightbox. The content will not be updated, it is up to the caller to update the content
    *
    * @param afterOpen a callback function to call after the lb has finished loading.
    */
   show: function( afterOpen )
   {
     //If the lightboxWrapper is null, open the light box.
     if ( !this.lightboxWrapper )
     {
       open( afterOpen );
       return;
     }

     lightbox._currentLightbox = this;
     document.body.appendChild( this.overlay );
     new Effect.Opacity( this.overlay, {
       from: 0.0, to: 0.5, duration: 0,  // duration must be 0 to avoid focus problem with IE & screen reader
       afterFinish: function()
       {
         this.lightboxWrapper.removeClassName("hideme");
         Event.observe( window, 'resize', this.boundResizeListener );
       }.bind( this ) });
   },

   /**
    * Closes the lightbox.
    */
   close: function(hide)
   {
      if ( /MSIE (\d+\.\d+);/.test( navigator.userAgent ) && this._ytPlayers )
      {
        // This gives the list of all the ytplayers in the page.. need to find the correct one.
        for ( var i = this._ytPlayers.length - 1; i >= 0; i-- )
        {
          var currentPlayer = this._ytPlayers[ i ];
          var lightboxDiv = page.util.upToClass( currentPlayer.getIframe(), "lb-content" );
          if ( lightboxDiv )
          {
            if ( currentPlayer.stopVideo )
            {
              currentPlayer.stopVideo();
            }
            
            var iframe = currentPlayer.getIframe();
            iframe.style.display = 'none';
            iframe.src = "";

            if ( currentPlayer.clearVideo )
            {
              currentPlayer.clearVideo();
            }
            
            break;
          }
        }
      }

     this._hideLightBox = hide;
     if (this.cfg.onClose) {
       if ( Object.isFunction( this.cfg.onClose ) )
       {
         this.cfg.onClose();
       }
       else
       {
         var closeFunc = new Function(this.cfg.onClose);
         closeFunc();
       }
    }
     Event.stopObserving( window, 'resize', this.boundResizeListener );
     if ( this.movedElement && this.originalParent )
     {
       this.movedElement.parentNode.removeChild( this.movedElement );
       this.originalParent.appendChild( this.movedElement );
       this.movedElement.style.display = this.movedElement.originalDisplay;
     }

     if ( !this._hideLightBox )
     {
       this._clearLightboxContent();
       this.lightboxWrapper.remove();
     }
     else
     {
       this.lightboxWrapper.addClassName("hideme");
     }

     new Effect.Opacity( this.overlay, {
      from: 0.3, to: 0.0, duration: 0, // duration must be 0 to avoid focus problem with IE & screen reader
      afterFinish: function()
      {
         this.overlay.remove();
         this._toggleTroubleElements( false );
         this._fixIE( false );
         if ( !this._hideLightBox )
         {
          lightbox._currentLightbox = null;
         }
         if ( this.cfg.focusOnClose ) { $(this.cfg.focusOnClose).focus(); }
      }.bind( this ) });
   },
   /**
    * Hide the lightbox.
    */
   hide: function()
   {
     this.close(true);
   },
   resize: function( newDimensions )
   {
     this.cfg.dimensions = newDimensions; // might be null, in which case it is auto-resize
     this._resizeAndCenterLightbox( );
   },


   /** Event listener for opening lb. */
   _onOpen: function( event ) { this.open(); event.stop(); },
   /** Event listener for closing lb. */
   _onClose: function( event ) { this.close(); event.stop(); },
   /** Event listener wired when closeOnBodyClick is true. */
   _onOverlayClick: function( event ) { if ( event.element() == this.overlay ) { this.close(); } event.stop(); },
   /** Event listener for keyboard presses in the LB. */
   _onKeyPress: function( event )
   {
     var key = event.keyCode || event.which;
     var elem = event.element();
     // Close on ESC type
     if ( key == Event.KEY_ESC )
     {
       this.close();
       event.stop();
     }
     // Set up the tab loop (don't tab/shift-tab out of the lb)
     else if ( key == Event.KEY_TAB && !event.shiftKey && elem == this.lastLink )
     {
       this.firstLink.focus();
       event.stop();
     }
     else if ( key == Event.KEY_TAB && event.shiftKey && elem == this.firstLink )
     {
       this.lastLink.focus();
       event.stop();
     }

   },
   /** Event listener for window resize. */
   _onWindowResize: function( event )
   {
     this._resizeAndCenterLightbox( false );
   },
   /**
    * Clears the lightbox.
    */
   _clearLightboxContent: function()
   {
     this.lightboxContent.update( '' );
   },
   /**
    * Updates the lightbox content based on the configuration.
    * @param afterFinish a callback to call after the content has finished updating.
    */
   _updateLightboxContent: function( afterFinish )
   {
     if ( this.cfg.ajax ) //Async
     {
       this._resizeAndCenterLightbox( true );
       var lbc = this.lightboxContent;
       var lbcDim = lbc.getDimensions();
       lbc.update(
         this.cfg.processingTemplate.interpolate(
         {
           loadingText: this.cfg.msgs.loading,
           width: (lbcDim.width - this._extraWidth( lbc, false ) ),
           height: (lbcDim.height - this._extraHeight( lbc, false, true ) )
         } )
       ).setStyle({
           overflow: 'hidden'
       }).focus();

       var url = this.cfg.ajax.url || this.cfg.openLink.href;
       var params = this.cfg.ajax.params || {};
       var requestMethod = this.cfg.ajax.method || 'get';
       var asynFlag = this.cfg.ajax.asyn == null || this.cfg.ajax.asyn
       var cb = function( response )
       {
         lbc.setStyle({ overflow: 'auto' });
         this._updateLightboxContentHelper( response.responseText, afterFinish );
       }.bind( this );
       new Ajax.Request( url, {
        method: requestMethod ,
        asynchronous : asynFlag,
        parameters: params,
        onSuccess: cb,
        onFailure: cb
       });
     }
     else //Static
     {
       var c = this.cfg.contents; //Normal string contents
       if ( Object.isFunction( c ) ) //Function to get contents
       {
         c = c( this );
       }
       else if ( !Object.isString( c ) && !(Object.isArray( c ) ) ) //Config object
       {
         if ( c.id ) //Load contents from an element on the page already
         {
           var elem = $( c.id );

           //Lightbox can contain the elements that are considered to be 'trouble elements'.
           //Loop through to make sure that they are visible in the lightbox.
           this._toggleTroubleElementsHelper( elem, false );

           if ( c.move )
           {
             c = elem;
           }
           else
           {
             if( c.stripComments !== undefined && c.stripComments )
             {
               c = elem.innerHTML.replace('<!--','').replace('-->','');
               c = this._recreateMashupsHtml( c  );
             }
             else
             {
               c = elem.innerHTML;
             }
           }
         }
         else if ( c.auto && this.cfg.openLink ) // Attempt to auto load the content from the link href based on the file extension
         {
           var h = this.cfg.openLink.href;
           if ( lightbox._imageTypeRE.test( h ) )
           {
             c = '<img src="' + h + '" style="vertical-align:top;display:block;" alt="'+ this.cfg.title+'">';
           }
           else
           {
             c = "";
           }
         }
       }
       this._updateLightboxContentHelper( c, afterFinish );
     }
   },
   /**
    * Helper that actually updates the contents of the lb.
    * @param content the HTML content for the lb.
    * @param afterFinish a callback that will be called when the update is done.
    */
   _updateLightboxContentHelper: function( content, afterFinish )
   {
     var lbc = this.lightboxContent;
     var element;

     if ( Object.isElement( content ) )
     {
       element = content;
       content = "<div id='lb-container' class='lb-container'></div>";
     }

     this.evaluatingScripts = false;
     if (this.cfg.ajax && this.cfg.ajax.loadExternalScripts )
     {
       // Make sure all global scripts are evaluated in the lightbox content:
       content = Object.toHTML(content);
       lbc.innerHTML = content.stripScripts();
       this.evaluatingScripts = true;
       page.globalEvalScripts( content, true, this);
     }
     else
     {
       lbc.update(content);
     }
    
     if ( element )
     {
       this.originalParent = element.parentNode;
       this.movedElement = element;
       $( 'lb-container').appendChild( element );
       this.movedElement.originalDisplay = this.movedElement.style.display;
       element.show();
     }
     this._resizeWhenImagesReady( afterFinish );
     if ( !this.firstLink )
     {
       this.firstLink = lbc.down('a');
     }
     if ( this.firstLink )
     {
       (function() { this.firstLink.focus(); }.bind(this).defer( 1 ));
     }
   },

   /**
    * Since images don't load immediately, we need to wait until they've
    * loaded before resizing
    */
   _resizeWhenImagesReady: function( afterFinish )
   {
     var lbw = this.lightboxWrapper, lbc = this.lightboxContent;
     var imgs = lbc.getElementsByTagName( 'img' );
     var iterations = 0;
     if (( !this.cfg.dimensions && imgs.length > 0 ) || (this.evaluatingScripts))
     {
       new PeriodicalExecuter( function( pe )
       {
         iterations++;
         var allDone = page.util.allImagesLoaded( imgs );
         if (this.evaluatingScripts)
         {
           allDone = false;
         }
         // Done, or waited more than 5 seconds
         if ( allDone || iterations > 50 )
         {
           //Show the lightbox
           lbw.show();
           lbc.focus();
           this._resizeAndCenterLightbox( false );
           if ( afterFinish ) { afterFinish(); }
           this._initializeBottomSubmitStep( lbc );
           pe.stop();
         }
       }.bind(this),0.1);
     }
     else
     {
       this._resizeAndCenterLightbox( false );
       if ( afterFinish ) { afterFinish(); }
       this._initializeBottomSubmitStep( lbc );
     }
   },

   /**
    * Invoke page.util.pinBottomSubmitStep if bottom submit button is found.
    * This method is called with the light box content has been fully loaded.
    */
   _initializeBottomSubmitStep: function( lbc )
   {
	 var bottomSubmitToBePinned = page.util.getBottomSubmitStep();
     if ( bottomSubmitToBePinned ){
         page.util.pinBottomSubmitStep( bottomSubmitToBePinned, lbc );
       }
   },

   /**
    * Size the lightbox and make sure that it is centered in the viewport.
    * @param isLoading whether we're in the async loading phase.
    */
   _resizeAndCenterLightbox: function( isLoading )
   {
     var lbw = this.lightboxWrapper,
         lbc = this.lightboxContent,
         lbt = this.lightboxTitle, title, lbDim;

     if ( lbt ) //Ensure a long title doesn't cause the lightbox to get very wide.
     {
       title = lbt.innerHTML;
       lbt.update( '' );
     }

     if ( this.cfg.dimensions ) // explicitly defined size
     {
       lbw.setStyle( { width: this.cfg.dimensions.w + 'px',  height: this.cfg.dimensions.h + 'px' } );
     }
     else if (isLoading) // temporary loading size
     {
       lbw.setStyle({ width: this.cfg.defaultDimensions.w + 'px', height: this.cfg.defaultDimensions.h + 'px'});
     }
     else // auto-size
     {
      lbw.setStyle( { width: '',  height: '' } );
      lbc.setStyle( { height: '' } );
      lbDim = lbw.getDimensions();
      lbDim.width = lbDim.width - this._extraWidth( lbw, false);
      lbDim.height = lbDim.height - this._extraHeight( lbw, false, true);
      if ( this.cfg.useDefaultDimensionsAsMinimumSize )
      {
        // resize width and height to the minimum set
        if ( lbDim.width < this.cfg.defaultDimensions.w )
        {
          lbDim.width = this.cfg.defaultDimensions.w;
        }
        if( lbDim.height <  this.cfg.defaultDimensions.h )
        {
           lbDim.height =  this.cfg.defaultDimensions.h;
      }
      }
       lbw.setStyle( { width: ( lbDim.width ) + 'px',  height: ( lbDim.height ) + 'px' } );
     }
     var viewDim = document.viewport.getDimensions();
     lbDim = lbw.getDimensions();
     if ( this.cfg.constrainToWindow )
     {
       var maxWidth = viewDim.width - this.cfg.horizontalBorder, maxHeight = viewDim.height - this.cfg.verticalBorder;
       if ( lbDim.width > ( maxWidth ) )
       {
         lbw.setStyle( { width: ( maxWidth ) + 'px' } );
       }
       if ( lbDim.height > ( maxHeight ) )
       {
         lbw.setStyle( { height: ( maxHeight ) + 'px' } );
       }
       lbDim = lbw.getDimensions();
     }
     var l = parseInt( ( viewDim.width / 2.0 ) - (lbDim.width / 2.0 ) , 10 );
     var t = parseInt( ( viewDim.height / 2.0 ) - (lbDim.height / 2.0 ) , 10 );
     if (this.cfg.top){
       t = this.cfg.top;
     }
     if (this.cfg.left){
       l = this.cfg.left;
     }
     lbw.setStyle({ left: l + "px", top: t + "px" });
     var h = ( lbDim.height - this._extraHeight( lbw, false, false ) - this._extraHeight( lbc, true, true ) - lbc.positionedOffset().top );
     if (h >= 0)
     {
       lbc.setStyle({ height: h + "px"});
     }

     if ( lbt )
     {
       lbt.update( title );
     }
   },
   /**
    * Calculate the extra height added by padding and border.
    * @param element DOM elem to calculate the extra height for.
    * @param mBot whether to include the bottom margin
    * @param pTop whether to include the top padding.
    */
   _extraHeight: function( element, mBot, pTop )
   {
     var r = 0, dims = ['paddingBottom','borderTopWidth','borderBottomWidth'].concat(
       mBot ? ['marginBottom'] : [] ).concat(
       pTop ? ['paddingTop'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Calculate the extra width added by padding, border, (optionally margin)
    * @param element DOM elem to calculate the extra width for.
    * @param m whether to include margins
    */
   _extraWidth: function( element, m )
   {
     var r = 0, dims = ['paddingLeft','paddingRight','borderLeftWidth','borderRightWidth'].concat(
       m ? ['marginLeft','marginRight'] : [] );
     dims.each( function( d ) { r += parseFloat( element.getStyle( d ) ) || 0; });
     return r;
   },
   /**
    * Regrettably, some JavaScript hacks are necessary for IE 6
    * @param on whether to turn the hacks on or off
    */
   _fixIE: function( on )
   {
     if ( /MSIE 6/i.test(navigator.userAgent) )
     {
       var body = document.getElementsByTagName('body')[0];
       var html = document.getElementsByTagName('html')[0];
       if ( on )
       {
         this.currentScroll = document.viewport.getScrollOffsets();
         window.scrollTo( 0, 0 );
       }
       Element.setStyle( body, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       Element.setStyle( html, ( on ? { height: '100%', overflow: 'hidden' } : { height: '', overflow: '' } ) );
       this.overlay.setStyle( ( on ? { width: "120%", height: "100%"} : { width: "", height: ""} ));
       if ( !on )
       {
         window.scrollTo( this.currentScroll.left, this.currentScroll.top );
       }
     }
   },

   _toggleTroubleElementsHelper : function( contentElem, turnOff )
   {
     this.cfg.troubleElems.each( function(elemType) {

       var elems;
       if ( contentElem === null )
       {
         elems = document.getElementsByTagName( elemType );
       }
       else
       {
         elems = contentElem.getElementsByTagName( elemType );
       }

       var numElems = elems.length;
       for ( var i = 0; i < numElems; i++ )
       {
         try
         {
           elems[i].style.visibility = (turnOff ? 'hidden' : '');
         }
         catch ( e )
         {
           // Setting visibility blows up on Linux Chrome; just ignore this error, as the only
           // real consequence will be some potential UI artifacts
         }
       }
     }.bind( this ) );
   },

   /**
    * Toggle elements that may bleed through the lightbox overlay.
    * @param turnOff whether to turn off the elements.
    */
   _toggleTroubleElements: function( turnOff )
   {
     this._toggleTroubleElementsHelper( document, turnOff );
   },
   
   /**
    * Mashups could contain malicious data entered by users. 
    * So extract the required information and recreate mashup HTML to display in lightbox.
    * @param oldContent current HTML data for mashup.
    */
   _recreateMashupsHtml: function( oldContent )
   {
     var mashupType = this._checkMashupType( oldContent );
     var isLegacy = this._checkMashupIslegacy( oldContent, mashupType );
     var returnStr = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>';
     
     if( mashupType === "youtube" )
     {
       return this._recreateYoutubeHtml( oldContent, isLegacy );
     }
     else if( mashupType === "slideshare" )
     {
       return this._recreateSlideshareHtml( oldContent, isLegacy );
     }
     else if( mashupType === "flickr" )
     {
       return this._recreateFlickrHtml( oldContent );
     }
     else
     {
       MashupDWRFacade.filterMashupData( oldContent, {
         async : false,
         callback : function( filteredData )
           {
             returnStr =  filteredData;
           }
         } );
     }
     
     return returnStr ;
   },
   
   _checkMashupType: function( oldContent )
   {
     var mashupType = "";
     if( ( oldContent.indexOf("openYtControls") !== -1 ) || ( oldContent.indexOf("//www.youtube.com/") !== -1 ) )
     {
       mashupType = "youtube";
     }
     else if( (oldContent.indexOf("slidesharecdn") !== -1) || (oldContent.indexOf("www.slideshare.net/slideshow") !== -1) )
     {
       mashupType = "slideshare";
     }
     else if( oldContent.indexOf("flickr") !== -1 )
     {
       mashupType = "flickr";
     }
     return mashupType;
   },
   
   _checkMashupIslegacy: function( oldContent, mashupType )
   {
     var isLegacy = false;
     if( (mashupType === "youtube" || mashupType === "slideshare" ) && oldContent.indexOf("<object") != -1 )
     {
       isLegacy = true;
     }
     else if(  (mashupType === "flickr" ) && oldContent.indexOf("<img") != -1 )
     {
       isLegacy = true;
     }
     return isLegacy;
   },

   _recreateYoutubeHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var videoId = "";
     var strYtUrl = "";
     var newHTML = "";
     var uniqueId = "";
      
     //valid youtube video id could contain a-z, A-Z, 0-9, "_" and "-" only.
     oldContent = oldContent.replace(/&#45;/g,'-');
     oldContent = oldContent.replace(/&#95;/g,'_');
     
     if( isLegacy )
     {
       videoId = oldContent.match("//www.youtube.com/v/([\\d\\w-_]+)")[1];
     }
     else
     {
       videoId = oldContent.match("//www.youtube.com/embed/([\\d\\w-_]+)")[1];
     }
     
     if( oldContent.indexOf("openYtControls") !== -1 )
     {
       uniqueId = oldContent.match("openYtControls([\\d\\w]+)")[1];
     }
     //to make sure video plays in popup preview
     strYtUrl = "https://www.youtube.com/embed/" + videoId + "?modestbranding=1&fs=1&rel=0&menu=disable&enablejsapi=1&playerapiid=ytEmbed" + uniqueId + "&wmode=transparent";

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     //regenerate HTML to display in lightbox.
     //yt video with player controls.
     if( uniqueId !== "" && strYtUrl !== "" )
     {
   
       
       newHTML = '<div style=\"margin: 10px;\"><div class=\"u_controlsWrapper\"></div>' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.embeddedVideoPlayer' ) +': ' + title + '</h2>' +
       '<div style=\"word-wrap: break-word;\">';
      
       //create iframe tag
       newHTML += '<div class=\"previewDiv ytIframeClass\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + uniqueId + '\">' + 
       '<iframe id=\"ytObject' + uniqueId + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  ' allowfullscreen></iframe>';

       newHTML += '<a href=\"#close\" onclick=\"lightbox.closeCurrentLightbox(); return false;\" class=\"hideoff\">' +
       page.bundle.getString( 'inlineconfirmation.close' ) + '</a></div>' + 
       '<div id=\"strip' +  uniqueId + '\" class=\"liveArea-slim playerControls\" style=\"display:none\">' +
       '<h2 class=\"hideoff\">' + page.bundle.getString( 'display.videoStatus' ) +': ' + title + '</h2>' +
       '<span aria-live=\"off\" id=\"currentStatus' +  uniqueId + '\"></span>' +
       '</div></div></div>';
     }
     //yt video without player controls.
     if( uniqueId === "" && strYtUrl !== "" )
     {
       newHTML = '<div class=\"previewDiv\" style=\"height:344px;width:425px\"' + 
       ' id=\"ytEmbed' + '\">' + 
       '<iframe id=\"ytObject' + '\"' + ' width=\"425\" height=\"344\" src=\"' + strYtUrl + '\"' + 
       ' title=\"' + title + '\"' +  '></iframe></div>';  
     }

     return newHTML;
   },
   convertTime : function (duration) {
	   var total = 0;
	   var hours = duration.match(/(\d+)H/);
	   var minutes = duration.match(/(\d+)M/);
	   var seconds = duration.match(/(\d+)S/);
	   if (hours) total += parseInt(hours[1]) * 3600;
	   if (minutes) total += parseInt(minutes[1]) * 60;
	   if (seconds) total += parseInt(seconds[1]);
	   return total;
	 },
   formatTime : function ( sec )
   {
     var duration = parseInt( sec, 10 );
     var totalMinutes = Math.floor( duration / 60 );
     var hours = Math.floor( totalMinutes / 60 );
     var seconds = duration % 60;
     var minutes = totalMinutes % 60;
     if ( hours > 0 )
     {
       return hours + ':' + this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
     else
     {
       return this.padZero( minutes ) + ':' + this.padZero( seconds );
     }
   },
   padZero : function ( number )
   {
     if (number < 10)
     {
       return "0" + number;
     }
     else
     {
       return number;
     }
   },
   
   _recreateSlideshareHtml: function( oldContent, isLegacy )
   {
     var title = "";
     var slideShowId = "";
     var ssSearchKey = "";
     var authorName = "";
     var newHTML = "";
     if( isLegacy ) 
     {
       oldContent = oldContent.replace(/&#45;/g,'-');
       ssSearchKey = oldContent.match("id=[\"]__sse(\\d+)")[1];
     }
     else
     {
       // New Slideshare oEmbed documentation at http://www.slideshare.net/developers/oembed; oEmbed specs at http://www.oembed.com
       ssSearchKey = oldContent.match("<a[^>]*>((?:.|\r?\n)*?)<\/a>")[0];
       ssSearchKey = ssSearchKey.replace(/&#45;/g,'-');
       ssSearchKey = ssSearchKey.match( "href=\"(http|https):\/\/www.slideshare.net\/([A-Za-z0-9]|[-_~.*!()/&#;#%'?=@+$,])*\"" )[0];
       ssSearchKey = ssSearchKey.substring( 6, ssSearchKey.length - 1 );
     }
     
     //make a call to slide share server and get real data.
     var url =  "https://www.slideshare.net/api/oembed/2?url=https://www.slideshare.net/" + ssSearchKey + "&format=json";
     
     MashupDWRFacade.verifyMashupData( url, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             slideShowId = videoJSON.slideshow_id;
             authorName = videoJSON.author_name;
           }
         }
       } );
     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     slideShowId = $ESAPI.encoder().canonicalize( slideShowId + "" );
     slideShowId = $ESAPI.encoder().encodeForHTMLAttribute( slideShowId + "" );
     authorName = $ESAPI.encoder().canonicalize( authorName );
     authorName = $ESAPI.encoder().encodeForHTMLAttribute( authorName );
     if( slideShowId !== '' )
     {
       //create iframe tag
       return '<iframe src=\"https://www.slideshare.net/slideshow/embed_code/' + slideShowId + '\" ' +
       ' width=\"427\" height=\"356\" frameborder=\"0\" marginwidth=\"0\" marginheight=\"0\"  scrolling=\"no\" ' +
       ' style=\"border:1px solid #CCC;border-width:1px 1px 0;margin-bottom:5px\"  allowfullscreen></iframe>' +
       '<div style="margin-bottom:5px"><strong><a href=\"#\" title=\"' +
       title + '\">' + title + '</a></strong> <strong><a href=\"#\">' +
       authorName + '</a></strong>.</div>';
     }
     
     return newHTML ;
   },
   
   _recreateFlickrHtml: function( oldContent )
   {
     var flickrImgSrcUrl = "";
     var title = "";
     var flickrKey = "";
     var newHTML = "";

     flickrKey = oldContent.match("//www.flickr.com/photos/([\\d\\w@/]+)")[1];
     var flickrUrl = "https://www.flickr.com/services/oembed?url=http://flickr.com/photos/" + flickrKey + 
                     "&format=json&maxheight=640&maxwidth=640";
     
     MashupDWRFacade.verifyMashupData( flickrUrl, {
       async : false,
       callback : function( returnString )
         {
           if( returnString === "" )
           {
             newHTML = '<div style=\"margin: 10px;\">' + page.bundle.getString( 'mashups.content.data.msg' ) + '</div>' ;
           }
           else
           {
             var videoJSON = returnString.evalJSON( true );
             title = videoJSON.title;
             //sometimes http://flickr.com/services/oembed doesn't return url
             if ( videoJSON.url === null )
             {
               flickrImgSrcUrl = videoJSON.thumbnail_url;
             }
             else
             {
               flickrImgSrcUrl = videoJSON.url;
             }
           }
         }
       } );

     title = $ESAPI.encoder().canonicalize( title );
     title = $ESAPI.encoder().encodeForHTMLAttribute( title );
     if( flickrImgSrcUrl !== '' )
     {
       return '<div style=\"margin: 10px;\"><a href=\"http://flickr.com/photos/' + flickrKey + '\"' +
       '  target=\"_blank\" title=\"' + page.bundle.getString( 'display.view.on.flickr' ) + '\" />' +
       '<img src="' + flickrImgSrcUrl + '\"  alt=\"' + title + '\"></a></div>';
     }
     return newHTML ;
   }
  }),

  /* Static properties/methods */
  _imageTypeRE: /(\.bmp|\.gif|\.jpeg|\.jpg|\.png|\.tiff)$/i, /** Regex for sniffing image files */
  _currentLightbox: null, /** Currently open lightbox */
  /** Returns the currently open lightbox (null if no lightbox is open) */
  getCurrentLightbox: function()
  {
    return lightbox._currentLightbox;
  },
  // This is currently only called from page.js when the vtbe is toggled.  It is used
  // to reload the page and respect the new vtbe settings.
  // NOTE that there is a limitation of not allowing VTBEs both in-page and in-lightbox. If
  // we ever run into a situation where we have a vtbe on-page and then open a lightbox with
  // a VTBE in the lightbox then we'll have to enhance the vtbe infrastructure to deal with this properly.
  deferUpdateLightboxContent: function ( )
  {
    if (lightbox._currentLightbox && window.vtbeInLightbox)
    {
      vtbe_map = {}; // Turf all vtbe's
      (function() {
        lightbox._currentLightbox._updateLightboxContent();
      }).bind(this).delay(0.1);
      return true;
    }
    return false;
  },
  /**
   * Close the currently open lightbox (if any)
   */
  closeCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.close();
    }
  },
  /**
   * Hide the currently open lightbox (if any)
   */
  hideCurrentLightbox: function()
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      lb.hide();
    }
  },
  /**
   * Update the current lightbox content.
   * @param type either "ajax" or "static"
   * @param value
   *   if type is ajax, the same format as the lb ajax config parameter.
   *   if type is static, the same format as the lb contents config parameter.
   */
  updateCurrentLightboxContent: function( type, value )
  {
    var lb = lightbox._currentLightbox;
    if ( lb )
    {
      var oldAjax = lb.cfg.ajax, oldContents = lb.cfg.contents;
      lb.cfg.ajax = ( type == 'ajax' ) ? value : false;
      lb.cfg.contents = ( type == 'ajax' ) ? null : value;
      lb._updateLightboxContent( function() {
        lb.cfg.ajax = oldAjax;
        lb.cfg.contents = oldContents;
      });
    }
  },
  /**
   * Parse a JSON representation of the config into an object suitable for
   * passing to the lb constructor.
   * @param serializedConfig JSON config string.
   */
  parseConfig: function( serializedConfig ) //Safely parses a JSON representation of the config
  {
    return serializedConfig ? serializedConfig.replace(/'/g, '"').evalJSON( true ) : {};
  },
  /**
   * Autowire all links.with the given class on the page to open in lb.  Call this after the page has loaded.
   * The "lb:options" attribute can be added to the link to specify a JSON-formatted config string
   * that will be parsed and passed to the lb constructor.
   * @param className class of link that will be autowired.
   */
  autowireLightboxes: function( className, parentEl )
  {
    if (!parentEl)
    {
      parentEl = document;
    }
    var links = parentEl.getElementsByTagName('a');
    for ( var i = 0, len = links.length; i < len; i++ )
    {
      var a = links[i];
      if ( page.util.hasClassName( a, className ) )
      {
        a = $(a);
        var defOptions = ( lightbox._imageTypeRE.test( a.href ) ? "{'contents':{'auto':true}}" : "{'ajax':true}" );
        new lightbox.Lightbox( Object.extend( { openLink: a }, lightbox.parseConfig( a.getAttribute('lb:options') || defOptions ) ) );
      }
    }
  }
};
}
/** The collection of classes and methods that comprise the QuickLinks core implementation. */
var quickLinks =
{
    constants :
    {
        /** Constant identifier for identifying frame communications specific to this function */
        APP_CONTEXT : 'QuickLinks',

        /** Hotkey for the Quick Links UI */
        APP_HOTKEY :
        {
            accesskey : 'l',
            modifiers :
            {
                shift : true,
                alt : true
            }
        },

        // Constants for various window actions
        SET : 'set',
        ADD : 'add',
        REMOVE : 'remove',
        SHOW : 'show',
        ACTIVATE : 'activate',
        REMOVE_ALL : 'removeAll',
        DEFINE_KEY : 'defineKey',

        /** The order in which we process windows */
        WINDOW_ORDER_FOR_HEADERS :
        {
            mybbCanvas : 1,
            WFS_Files : 2,
            content : 3,
            WFS_Navigation : 4,
            nav : 5,
            'default' : 100
        },

        /** ARIA roles that we consider 'landmarks' */
        ARIA_LANDMARK_ROLES :
        {
            application : true,
            banner : true,
            complementary : true,
            contentinfo : true,
            form : true,
            main : true,
            navigation : true,
            search : true
        }
    },

    vars :
    {
        /** reference to lightbox object */
        lightbox : null,

        /** cached quick link data */
        data : $H(),

        /** Messages must originate from one of these sources */
        trustedProviders : $H(),

        // Cached references to HTML elements
        lightboxLandmarkList : null,
        lightboxLandmarkSection : null,
        lightboxHeaderList : null,
        lightboxHeaderSection : null,
        lightboxHotkeyList : null,
        lightboxHotkeySection : null,

        /** The instance of helper for the window containing this script */
        helper : null
    },

    /** Initialization of the UI/core implementation */
    initialize : function( trustedProviders )
    {
      // Initialize a lightbox to show collected links
      quickLinks.vars.lightbox = new lightbox.Lightbox(
      {
          title : page.bundle.getString( 'quick_links.lightbox_title' ),
          contents :
          {
            id : 'quickLinksLightboxDiv'
          },
          'dimensions' :
          {
              w : 800,
              h : 600
          }
      } );

      // Add trusted content providers from whom we accept messages
      if ( trustedProviders )
      {
        trustedProviders.each( function( tp )
        {
          if ( tp )
          {
            quickLinks.vars.trustedProviders.set( tp, true );
          }
        } );
      }
      quickLinks.vars.trustedProviders.set( quickLinks.util.getCurrentOrigin(), true );

      // Add listener for frame communications
      Event.observe( window.top, 'message', quickLinks.messageHelper.onMessageReceived );

      // When link is active, modify the wrapping div
      var wrapperDiv = $( 'quick_links_wrap' );
      Event.observe( $( 'quick_links_lightbox_link' ), 'focus', function( event )
      {
        this.addClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );
      Event.observe( $( 'quick_links_lightbox_link' ), 'blur', function( event )
      {
        this.removeClassName( 'quick_link_wrap_focus' );
      }.bind( wrapperDiv ) );

      // Cache references to some elements
      quickLinks.vars.lightboxLandmarkList = $( 'quick_links_landmark_list' );
      quickLinks.vars.lightboxHeaderList = $( 'quick_links_heading_list' );
      quickLinks.vars.lightboxHotkeyList = $( 'quick_links_hotkey_list' );
      quickLinks.vars.lightboxLandmarkSection = $( 'quick_links_landmarks_section' );
      quickLinks.vars.lightboxHeaderSection = $( 'quick_links_headings_section' );
      quickLinks.vars.lightboxHotkeySection = $( 'quick_links_hotkeys_section' );
    },

    /** Factory method that creates a Helper for frames that require it */
    createHelper : function()
    {
      // If this is not a popup and this is not a top-level window without the quick links UI link
      // (for instance if someone opened one of the frames in a separate tab)
      if ( !window.opener && ( quickLinks.util.loadedInIframe() || $( 'quick_links_lightbox_link' ) ) )
      {
        if ( !quickLinks.vars.helper )
        {
          quickLinks.vars.helper = new quickLinks.Helper();
        }
      }
    },

    /**
     * Add a hot key definition. Not attached if in iframe.
     * 
     * @param hotkey is an object with keys label, accesskey, and modifiers. modifiers is an object with one or more of
     *          the keys -- control, shift, and alt -- set to a value expression that evaluates to true.
     * @param sourceId may be null and will default to the string used for all other quicklinks from the current window.
     */
    addHotKey : function( sourceId, hotkey )
    {
      if ( hotkey && !quickLinks.util.loadedInIframe() )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : [ hotkey ]
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Add hot key definition. See #addHotKey.
     * 
     * @param hotkeys hotkeys is an array of hotkey definitions as described in #addHotKey.
     */
    addHotKeys : function( sourceId, hotkeys )
    {
      if ( hotkeys && !quickLinks.util.loadedInIframe() )
      {
        quickLinks.messageHelper.postMessage( window.top,
        {
            sourceId : sourceId || quickLinks.util.getCurrentWindowId(),
            context : quickLinks.constants.APP_CONTEXT,
            action : quickLinks.constants.ADD,
            hotkeys : hotkeys
        }, quickLinks.util.getCurrentOrigin() );
      }
    },

    /**
     * Removes all content for the specified source. If sourceId evaluates to false, all content for the window that
     * calls this method will be removed.
     */
    removeAll : function( sourceId )
    {
      quickLinks.messageHelper.postMessage( window.top,
      {
          sourceId : sourceId,
          context : quickLinks.constants.APP_CONTEXT,
          action : quickLinks.constants.REMOVE_ALL
      }, quickLinks.util.getCurrentOrigin() );
    },

    /** A set of functions that deal with inter-window communication */
    messageHelper :
    {
        /** The handler for messages sent to window.top from other windows (or self) */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT &&
               quickLinks.vars.trustedProviders.get( event.origin ) )
          {
            if ( data.action === quickLinks.constants.SET )
            {
              quickLinks.dataHelper.setQuickLinks( event.source, event.origin, data );
              quickLinks.messageHelper.postHotkey( event.source );
            }
            else if ( data.action === quickLinks.constants.SHOW )
            {
              quickLinks.lightboxHelper.toggleLightbox( data.sourceId, data.activeElementId, event.origin );
            }
            else if ( data.action === quickLinks.constants.REMOVE_ALL )
            {
              if ( data.sourceId )
              {
                quickLinks.vars.data.unset( data.sourceId );
              }
              else
              {
                // Remove all content from calling window
                quickLinks.vars.data.values().each( function( value )
                {
                  if ( value.window === event.source )
                  {
                    quickLinks.vars.data.unset( value.sourceId );
                  }
                } );
              }
            }
            else if ( data.action === quickLinks.constants.ADD )
            {
              quickLinks.dataHelper.addQuickLinks( event.source, event.origin, data );
            }
            else if ( data.action === quickLinks.constants.REMOVE )
            {
              quickLinks.dataHelper.removeQuickLinks( data );
            }
          }
        },

        /** Posts the supplied message to the target window */
        postMessage : function( w, data, target )
        {
          if ( w.postMessage )
          {
            if ( Prototype.Browser.IE && data && typeof ( data ) !== 'string' )
            {
              data = Object.toJSON( data );
            }
            w.postMessage( data, target );
          }
        },

        /** Handle IE's behavior of passing objects as strings */
        translateData : function( data )
        {
          if ( Prototype.Browser.IE && typeof ( data ) === 'string' && data.isJSON() )
          {
            data = data.evalJSON();
          }
          return data;
        },

        /** Sends a message the supplied window instance about the hot-key defined for the QuickLinks UI */
        postHotkey : function( w )
        {
          quickLinks.messageHelper.postMessage( w,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.DEFINE_KEY,
              key : quickLinks.constants.APP_HOTKEY
          }, '*' );
        },

        /** Posts a message requesting the activation of the specified element */
        activateElement : function( sourceId, targetElementId, origin, isQuickLink )
        {
          // Reset focus
          quickLinks.vars.lightbox.cfg.onClose = null;
          quickLinks.vars.lightbox.cfg.focusOnClose = null;

          // Close lightbox
          quickLinks.lightboxHelper.closeLightbox();

          var windowEntry = quickLinks.vars.data.get( sourceId );

          // Focus on the target window
          windowEntry.window.focus();

          // Send a message to that window
          if ( windowEntry )
          {
            quickLinks.messageHelper.postMessage( windowEntry.window,
            {
                sourceId : quickLinks.util.getCurrentWindowId(),
                context : quickLinks.constants.APP_CONTEXT,
                action : quickLinks.constants.ACTIVATE,
                id : targetElementId,
                isQuickLink : isQuickLink
            }, origin );
          }
        }
    },

    /** A set of functions that deal with the management of the quick links data */
    dataHelper :
    {
        /** Create a hash for the hotkey definition */
        getHotKeyHash : function( key )
        {
          var result = key.accesskey;
          if ( key.modifiers )
          {
            result += key.modifiers.alt ? '-A' : '';
            result += key.modifiers.control ? '-C' : '';
            result += key.modifiers.shift ? '-S' : '';
          }
          return result;
        },

        /** Remove supplied quick links */
        removeQuickLinks : function( data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( value )
          {
            quickLinks.dataHelper.removeSelectionsById( value.headers, data.headers );
            quickLinks.dataHelper.removeSelectionsById( value.landmarks, data.landmarks );

            var selection =
            {};
            if ( data.hotkeys && value.hotkeys )
            {
              data.hotkeys.each( function( hotkey )
              {
                selection[ hotkey.id || quickLinks.dataHelper.getHotKeyHash( hotkey ) ] = true;
              } );
            }
            quickLinks.dataHelper.removeSelectionsById( value.hotkeys, selection );
          }
        },

        /** Remove those values from 'master' whose 'id' values exist in the 'selections' object */
        removeSelectionsById : function( master, selections )
        {
          if ( master && selections )
          {
            master = master.filter( function( i )
            {
              return i.id && !selections[ i.id ];
            } );
          }
          return master;
        },

        /** Overwrite any existing quick links */
        setQuickLinks : function( sourceWindow, origin, data )
        {
          quickLinks.vars.data.set( data.sourceId,
          {
              'window' : sourceWindow,
              sourceId : data.sourceId,
              origin : origin,
              headers : data.headers && [].concat(data.headers) || [],
              landmarks : data.landmarks && [].concat(data.landmarks) || [],
              hotkeys : quickLinks.dataHelper.normalizeHotKeys( data.hotkeys && [].concat(data.hotkeys) || [] )
          } );
        },

        /** Normalize the hotkey definition by adding the hash as an id if an id was not provided */
        normalizeHotKeys : function( hotkeys )
        {
          if ( hotkeys )
          {
            hotkeys.each( function( hotkey )
            {
              if ( !hotkey.id )
              {
                hotkey.id = quickLinks.dataHelper.getHotKeyHash( hotkey.key );
              }
            } );
          }
          return hotkeys;
        },

        /** Add quick links */
        addQuickLinks : function( sourceWindow, sourceOrigin, data )
        {
          var value = quickLinks.vars.data.get( data.sourceId );
          if ( !value )
          {
            value =
            {
                'window' : sourceWindow,
                sourceId : data.sourceId,
                origin : sourceOrigin,
                headers : [],
                landmarks : [],
                hotkeys : []
            };
            quickLinks.vars.data.set( data.sourceId, value );
          }
          if ( data.headers )
          {
            value.headers = value.headers.concat( data.headers );
          }
          if ( data.landmarks )
          {
            value.landmarks = value.landmarks.concat( data.landmarks );
          }
          if ( data.hotkeys )
          {
            value.hotkeys = value.hotkeys.concat( quickLinks.dataHelper.normalizeHotKeys( data.hotkeys ) );
          }
        }
    },

    /** A set of functions that deal with the management of the lightbox UI */
    'lightboxHelper' :
    {
        /** Toggles the QuickLinks lightbox state */
        toggleLightbox : function( targetWindowId, activeElementId, origin )
        {
          if ( lightbox.getCurrentLightbox() === quickLinks.vars.lightbox )
          {
            quickLinks.lightboxHelper.closeLightbox();
          }
          else
          {
            quickLinks.lightboxHelper.openLightbox( targetWindowId, activeElementId, origin );
          }
        },

        /** Opens the QuickLinks lightbox */
        openLightbox : function( targetWindowId, activeElementId, origin )
        {
          quickLinks.lightboxHelper.closeAllLightboxes();

          if ( targetWindowId && activeElementId && origin )
          {
            quickLinks.vars.lightbox.cfg.focusOnClose = null;
            quickLinks.vars.lightbox.cfg.onClose = function()
            {
              quickLinks.messageHelper.activateElement( targetWindowId, activeElementId, origin, false );
            }.bind( window.top );
          }
          else
          {
            quickLinks.vars.lightbox.cfg.onClose = null;
            quickLinks.vars.lightbox.cfg.focusOnClose = document.activeElement;
          }

          quickLinks.lightboxHelper.populateLightbox();
          quickLinks.vars.lightbox.open();
        },

        /** Closes the QuickLinks lightbox */
        closeLightbox : function()
        {
          quickLinks.lightboxHelper.clearLightboxContents();
          quickLinks.vars.lightbox.close();
        },

        /**
         * Close all open lightboxes. This will work only for lightboxes created using the core lightbox.js library and
         * opened from a frame that shares the same origin as window.top
         */
        closeAllLightboxes : function( w )
        {
          if ( !w )
          {
            w = window.top;
          }
          try
          {
            // Security errors appear in console even if we catch all exceptions, so try to avoid them
            if ( ( quickLinks.util.getCurrentOrigin() === quickLinks.util.getWindowOrigin( w ) ) && w.lightbox &&
                 w.lightbox.closeCurrentLightbox )
            {
              w.lightbox.closeCurrentLightbox();
            }
          }
          catch ( e )
          {
            // Ignore all exceptions -- probably caused by window of different origin
          }
          for ( var i = 0, iMax = w.frames.length; i < iMax; ++i )
          {
            quickLinks.lightboxHelper.closeAllLightboxes( w.frames[ i ] );
          }
        },

        /** Empties all content from the QuickLinks lightbox */
        clearLightboxContents : function()
        {
          quickLinks.vars.lightboxHeaderList.innerHTML = '';
          quickLinks.vars.lightboxLandmarkList.innerHTML = '';
          quickLinks.vars.lightboxHotkeyList.innerHTML = '';
        },

        /** Add known Quick Links to the lightbox UI after checking that they are still available on the page */
        populateLightbox : function()
        {
          if ( quickLinks.vars.data )
          {
            // Clear existing content
            quickLinks.lightboxHelper.clearLightboxContents();

            var keys = quickLinks.vars.data.keys();
            keys.sort( function( a, b )
            {
              var aWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ a ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              var bWeight = quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ b ] ||
                            quickLinks.constants.WINDOW_ORDER_FOR_HEADERS[ 'default' ];
              return aWeight - bWeight;
            } );

            keys.each( function( key )
            {
              var value = quickLinks.vars.data.get( key );
              if ( value.window.closed )
              {
                delete quickLinks.vars.data[ key ];
                return;
              }

              if ( value.landmarks )
              {
                value.landmarks.each( quickLinks.lightboxHelper.populateLandmark.bind( value ) );
              }
              if ( value.headers )
              {
                value.headers.each( quickLinks.lightboxHelper.populateHeader.bind( value ) );
              }
              if ( value.hotkeys )
              {
                value.hotkeys.each( quickLinks.lightboxHelper.populateHotkey.bind( value ) );
              }
            } );

            // Display only sections that have content
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHeaderList,
                                                    quickLinks.vars.lightboxHeaderSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxLandmarkList,
                                                    quickLinks.vars.lightboxLandmarkSection );
            quickLinks.lightboxHelper.checkSection( quickLinks.vars.lightboxHotkeyList,
                                                    quickLinks.vars.lightboxHotkeySection );
          }
        },

        /** Figure out if the element has content and display the corresponding section */
        checkSection : function( el, section )
        {
          if ( el.empty() )
          {
            section.hide();
          }
          else
          {
            section.show();
          }
        },

        /** Adds a single landmark to the lightbox UI */
        populateLandmark : function( landmark )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxLandmarkList.appendChild( li );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = landmark.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     landmark.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, landmark.label, landmark.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single header to the lightbox UI */
        populateHeader : function( heading )
        {
          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHeaderList.appendChild( li );
          li.setAttribute( 'class', 'quick_links_header_' + heading.type.toLowerCase() );

          var a = $( document.createElement( 'a' ) );
          li.appendChild( a );
          a.innerHTML = heading.label;
          a.setAttribute( 'href', '#' );
          a.setAttribute( 'onclick', 'quickLinks.messageHelper.activateElement("' + this.sourceId + '", "' +
                                     heading.id + '", "' + this.origin + '", true)' );
          var title = page.bundle.getString( 'quick_links.link.title', this.sourceId, heading.label, heading.type );
          a.setAttribute( 'title', title );
        },

        /** Adds a single hot-key definitions to the lightbox UI */
        populateHotkey : function( hotkey )
        {
          var span;
          var plus = ' ' + page.bundle.getString( 'quick_links.hotkey.combination_divider' ) + ' ';

          var li = document.createElement( 'li' );
          quickLinks.vars.lightboxHotkeyList.appendChild( li );

          var div = $( document.createElement( 'div' ) );
          li.appendChild( div );
          div.setAttribute( 'class', 'keycombo' );

          if ( hotkey.key.modifiers )
          {
            if ( hotkey.key.modifiers.shift )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.shift' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.control )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.control' );

              div.appendChild( document.createTextNode( plus ) );
            }

            if ( hotkey.key.modifiers.alt )
            {
              span = $( document.createElement( 'span' ) );
              div.appendChild( span );
              span.setAttribute( 'class', 'presskey' );
              span.innerHTML = page.bundle.getString( 'quick_links.hotkey.alt' );

              div.appendChild( document.createTextNode( plus ) );
            }
          }

          span = $( document.createElement( 'span' ) );
          div.appendChild( span );
          span.setAttribute( 'class', 'presskey alpha' );
          span.innerHTML = hotkey.key.accesskey;

          div.appendChild( document.createElement( 'br' ) );
          div.appendChild( document.createTextNode( hotkey.label ) );
        }
    },

    /** General helper functions that don't belong elsewhere */
    'util' :
    {
        /** Whether the current frame/page has a Course menu */
        isCoursePage : function()
        {
          return $( 'courseMenuPalette_paletteTitleHeading' ) ? true : false;
        },

        /** Whether the current frame/page is on the Content Collection tab */
        isContentSystemPage : function()
        {
          return quickLinks.util.getCurrentWindowId() === 'WFS_Files';
        },

        /** Returns the origin string for the current window as understood by the window.postMessage API */
        getCurrentOrigin : function()
        {
          return quickLinks.util.getWindowOrigin( window );
        },

        /** Returns the origin string for the supplied window as understood by the window.postMessage API */
        getWindowOrigin : function( w )
        {
          var url = w.location.href;
          return url.substring( 0, url.substring( 8 ).indexOf( '/' ) + 8 );
        },

        /** A name identifying the current window. Not guaranteed to be unique. */
        getCurrentWindowId : function()
        {
          if ( !window.name )
          {
            window.name = Math.floor( ( Math.random() * 10e6 ) + 1 );
          }
          return window.name;
        },

        /** @return "mac" if the client is running on a Mac and "win" otherwise */
        isMacClient : function()
        {
          return navigator.platform.toLowerCase().startsWith( "mac" );
        },

        /** The modifiers for access keys for the current platform/browser */
        getDefaultModifiers : function()
        {
          return ( quickLinks.util.isMacClient() ) ?
          {
              control : true,
              alt : true
          } :
          {
              shift : true,
              alt : true
          };
        },

        /** Whether this aria role is a 'landmark' */
        isAriaLandmark : function( el )
        {
          var role = el.getAttribute( 'role' );
          return role && quickLinks.constants.ARIA_LANDMARK_ROLES[ role.toLowerCase() ];
        },

        /** True if quick links is loaded in an iframe */
        loadedInIframe: function()
        {
          return window.self !== window.top;
        }
    },

    /**
     * Class used by all internally-sourced windows (anything that has a page tag that inherits from BasePageTag) to
     * communicate with quickLinks core
     */
    Helper : Class.create(
    {
        /** Constructor */
        initialize : function( config )
        {
          // Default values for configuration parameters.
          this.config = Object.extend(
          {
            trustedServer : quickLinks.util.getCurrentOrigin()
          }, config );

          Event.observe( window, 'message', this.onMessageReceived.bindAsEventListener( this ) );
          Event.observe( window, 'beforeunload', this.removeQuickLinks.bindAsEventListener( this ) );
          Event.observe( window, 'unload', this.stopParentObserving.bindAsEventListener( this ) );

          // Allow some time for other initialization to occur
          setTimeout( this.sendQuickLinks.bind( this ), 500 );
        },

        /** When window is unloaded */
        removeQuickLinks : function( event )
        {
          quickLinks.removeAll();
        },

        /**
        * Remove event listener on parent window. Used for when quick links is
        * in an iframe so the parent window won't be observing after iframe is
        * closed
        */
        stopParentObserving: function()
        {
          Event.stopObserving( window.top, 'message', quickLinks.messageHelper.onMessageReceived );
        },

        /** The handler for messages received from other window instances */
        onMessageReceived : function( event )
        {
          var data = quickLinks.messageHelper.translateData( event.data );
          if ( data && data.context === quickLinks.constants.APP_CONTEXT && event.origin === this.config.trustedServer )
          {
            if ( data.action === quickLinks.constants.ACTIVATE && data.id )
            {
              this.activateElement( $( data.id ), data.isQuickLink );
            }
            else if ( data.action === quickLinks.constants.DEFINE_KEY && data.key )
            {
              this.defineQuickLinksHotKey( event, data );
            }
          }
        },

        /** Defines the hotkey for the QuickLink UI */
        defineQuickLinksHotKey : function( event, data )
        {
          if ( this.keyDownHandler )
          {
            Event.stopObserving( document, 'keydown', this.keyDownHandler );
            this.keyDownHandler = null;
          }

          var source = event.source;
          var origin = event.origin;
          var key = data.key;

          this.keyDownHandler = function( ev )
          {
            var keyCode = ev.keyCode || ev.which;
            if ( ( String.fromCharCode( keyCode ).toLowerCase() === key.accesskey ) &&
                 ( !key.modifiers.shift || ev.shiftKey ) && ( !key.modifiers.alt || ev.altKey ) &&
                 ( !key.modifiers.control || ev.ctrlKey ) )
            {
              quickLinks.messageHelper.postMessage( source,
              {
                  sourceId : quickLinks.util.getCurrentWindowId(),
                  context : quickLinks.constants.APP_CONTEXT,
                  action : quickLinks.constants.SHOW,
                  activeElementId : document.activeElement ? $( document.activeElement ).identify() : null
              }, origin );
              ev.stop();
              return false;
            }
          }.bindAsEventListener( this );
          Event.observe( document, 'keydown', this.keyDownHandler );
        },

        /** Activates the specified element (focus or click as applicable) */
        activateElement : function( el, isQuickLink )
        {
          if ( el )
          {
            // Allow the element to accept focus temporarily
            var tabidx = el.getAttribute( 'tabindex' );
            if ( isQuickLink && !tabidx && tabidx !== 0 )
            {
              el.setAttribute( 'tabIndex', 0 );
            }

            // Pulsate for a few seconds if the element is visible
            if ( isQuickLink && el.visible() )
            {
              try
              {
                Effect.Pulsate( el );
              }
              catch ( e )
              {
                // Ignore all errors
              }
            }

            // Focus on the element
            el.focus();

            // Remove the tabindex so that we don't stop at this element later
            if ( isQuickLink && !tabidx && ( tabidx !== 0 ) )
            {
              el.setAttribute( 'tabIndex', Prototype.Browser.IE ? '-1' : '' );
            }
          }
        },

        /** Discovers quick links in the current window and sends them to the top window */
        sendQuickLinks : function()
        {
          var helper = this;

          var hotkeys = this.getElements( 'a[accesskey]', false, 'title' );
          if ( !quickLinks.util.loadedInIframe() )
          {
            hotkeys.push(
            {
                label : page.bundle.getString( 'quick_links.link_title' ),
                key : quickLinks.constants.APP_HOTKEY
            } );
          }
          var headers = this.getElements( [ 'h1', 'h2', 'h3', 'h4', 'h5', 'h6' ], true );
          if ( quickLinks.util.isCoursePage() || quickLinks.util.isContentSystemPage() )
          {
            headers = this.modifyHeaderOrder( headers );
          }
          var landmarks = this.getElements( '[role]', false, 'role', 'title', quickLinks.util.isAriaLandmark
              .bind( this ) );

          quickLinks.messageHelper.postMessage( window.top,
          {
              sourceId : quickLinks.util.getCurrentWindowId(),
              context : quickLinks.constants.APP_CONTEXT,
              action : quickLinks.constants.SET,
              headers : headers,
              landmarks : landmarks,
              hotkeys : hotkeys
          }, this.config.trustedServer );
        },

        /**
         * Find elements matching the supplied pattern, using the value of the attribute labelAttribute as the label.
         * Returns an array of Objects with each having the properties id, type, label, and key.
         */
        getElements : function( pattern, inspectAncestors, labelAttribute, parenAttribute, isValidQuickLink )
        {
          var helper = this;
          var result = [];
          var modifiers = quickLinks.util.getDefaultModifiers();
          $$( pattern ).each( function( el )
          {
            if ( !helper.isAvailableAsQuickLink( el, inspectAncestors ) )
            {
              return;
            }

            if ( isValidQuickLink && !isValidQuickLink( el ) )
            {
              return;
            }

            var id = el.getAttribute( 'id' );
            if ( !id )
            {
              id = el.identify();
            }
            var label = helper.getLabel( el, labelAttribute, parenAttribute );

            result.push(
            {
                id : id,
                type : el.tagName.toLowerCase(),
                label : label,
                key :
                {
                    modifiers : modifiers,
                    accesskey : el.getAttribute( 'accesskey' )
                }
            } );
          } );
          return result;
        },

        /** Whether the specified element should be shown in the QuickLinks UI */
        isAvailableAsQuickLink : function( element, inspectAncestors )
        {
          // Skip all checks if this is explicitly marked as a quick link or otherwise
          if ( element.hasClassName( 'quickLink' ) )
          {
            return true;
          }
          if ( element.hasClassName( 'hideFromQuickLinks' ) )
          {
            return false;
          }

          // If element is not visible, don't show it.
          if ( ( element.getStyle( 'zIndex' ) !== null ) || !element.visible() )
          {
            return false;
          }

          if ( inspectAncestors )
          {
            // Look for a hidden ancestor
            var elArray = element.ancestors();
            for ( var i = 0, iMax = elArray.length; i < iMax; ++i )
            {
              var el = elArray[ i ];
              var elName = el.tagName.toLowerCase();

              // Stop when we reach the body
              if ( elName === 'body' || elName === 'html' )
              {
                break;
              }

              if ( typeof el.visible === 'function' && !el.visible() )
              {
                return false;
              }
            }
          }

          return true;
        },

        /** Get the QuickLinks label for the specified element */
        getLabel : function( el, labelAttribute, parenAttribute )
        {
          var label = labelAttribute ? el.getAttribute( labelAttribute ) : null;
          if ( !label )
          {
            label = el.innerHTML.stripTags();
          }
          if ( label && parenAttribute )
          {
            var parenValue = el.getAttribute( parenAttribute );
            if ( parenValue )
            {
              label = page.bundle.getString( 'common.pair.paren', label, parenValue );
            }
          }
          return label;
        },

        /** Hack the order of headers for Course and Content System pages. It is Ugly, but it's also a requirement. */
        modifyHeaderOrder : function( headers )
        {
          if ( headers && headers.length > 0 )
          {
            var i, iMax;
            for ( i = 0, iMax = headers.length; i < iMax; ++i )
            {
              if ( headers[ i ].type.toLowerCase() === 'h1' )
              {
                break;
              }
            }
            if ( i !== 0 && i < iMax )
            {
              // move everything above the h1 to the bottom of the list
              var removed = headers.splice( 0, i );
              headers = headers.concat( removed );
            }
          }
          return headers;
        }
    } )
};