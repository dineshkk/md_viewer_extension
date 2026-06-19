const SyntaxHighlighter = (() => {
  function escapeHtml(text) {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
    return text.replace(/[&<>"']/g, c => map[c]);
  }

  // [regex_source, token_class] — order matters: strings/comments first
  const LANG_JS = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['`(?:[^`\\\\]|\\\\.)*`', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\/(?![*/])(?:[^/\\\\\\n]|\\\\.)+\/[gimsuy]*', 'sh-regex'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:true|false|null|undefined|NaN|Infinity)\\b', 'sh-builtin'],
    ['\\b(?:const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|default|new|delete|typeof|instanceof|void|in|of|class|extends|super|this|import|export|from|as|try|catch|finally|throw|async|await|yield|debugger|with|static|get|set)\\b', 'sh-keyword'],
    ['\\b(?:string|number|boolean|any|void|never|unknown|object|symbol|bigint|interface|type|enum|namespace|declare|readonly|keyof|infer|implements|abstract|private|protected|public)\\b', 'sh-type'],
    ['\\b(?:console|window|document|Array|Object|String|Number|Boolean|Map|Set|Promise|RegExp|Error|JSON|Math|Date|parseInt|parseFloat|require|module|exports)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_$][\\w$]*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_PYTHON = [
    ['#[^\n]*', 'sh-comment'],
    ['"""[\\s\\S]*?"""', 'sh-string'],
    ["'''[\\s\\S]*?'''", 'sh-string'],
    ['[fFrRbBuU]?"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["[fFrRbBuU]?'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:True|False|None)\\b', 'sh-builtin'],
    ['\\b(?:def|class|if|elif|else|for|while|return|import|from|as|try|except|finally|raise|with|yield|lambda|pass|break|continue|and|or|not|in|is|global|nonlocal|assert|async|await|del|print)\\b', 'sh-keyword'],
    ['\\b(?:self|cls|__[a-zA-Z_]+__)\\b', 'sh-builtin'],
    ['\\b(?:int|float|str|bool|list|dict|tuple|set|bytes|bytearray|type|range|enumerate|zip|map|filter|len|sorted|reversed|super|property|classmethod|staticmethod|isinstance|issubclass|hasattr|getattr|setattr|Exception|ValueError|TypeError|KeyError|IndexError|RuntimeError|StopIteration)\\b', 'sh-type'],
    ['\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?j?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_JAVA = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:true|false|null)\\b', 'sh-builtin'],
    ['\\b(?:public|private|protected|class|interface|extends|implements|static|final|abstract|void|return|if|else|for|while|do|switch|case|break|continue|default|new|this|super|try|catch|finally|throw|throws|import|package|synchronized|volatile|transient|native|enum|instanceof|assert)\\b', 'sh-keyword'],
    ['\\b(?:int|long|short|byte|char|float|double|boolean|String|Integer|Long|Double|Float|Boolean|Character|Byte|Short|Object|List|Map|Set|Collection|ArrayList|HashMap|HashSet|Optional|Stream|Iterable|Comparable|Serializable|Runnable|Callable|Future|CompletableFuture)\\b', 'sh-type'],
    ['\\b(?:0x[0-9a-fA-F]+[lL]?|0b[01]+[lL]?|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFdDlL]?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_$][\\w$]*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_SCALA = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"""[\\s\\S]*?"""', 'sh-string'],
    ['s"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ['f"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:true|false|null|Nil|None|Some)\\b', 'sh-builtin'],
    ['\\b(?:def|val|var|lazy|object|class|trait|extends|with|override|abstract|sealed|final|implicit|case|match|if|else|for|while|do|return|yield|throw|try|catch|finally|import|package|new|this|super|type|forSome|private|protected|public)\\b', 'sh-keyword'],
    ['\\b(?:Int|Long|Short|Byte|Char|Float|Double|Boolean|String|Unit|Any|AnyRef|AnyVal|Nothing|Null|Option|Some|None|Either|Left|Right|List|Seq|Set|Map|Array|Vector|Future|Try|Success|Failure|Tuple[0-9]*)\\b', 'sh-type'],
    ['\\b(?:0x[0-9a-fA-F]+[lL]?|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFdDlL]?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_$][\\w$]*(?=\\s*[\\[(])', 'sh-function'],
  ];

  const LANG_GO = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['`[^`]*`', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\\b(?:true|false|nil|iota)\\b', 'sh-builtin'],
    ['\\b(?:func|return|if|else|for|range|switch|case|default|break|continue|fallthrough|goto|var|const|type|struct|interface|map|chan|select|go|defer|package|import)\\b', 'sh-keyword'],
    ['\\b(?:int|int8|int16|int32|int64|uint|uint8|uint16|uint32|uint64|uintptr|float32|float64|complex64|complex128|string|bool|byte|rune|error|any)\\b', 'sh-type'],
    ['\\b(?:make|len|cap|new|append|copy|delete|close|panic|recover|print|println|complex|real|imag)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_RUST = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['#\\!?\\[[^\\]]*\\]', 'sh-decorator'],
    ['\\b(?:true|false)\\b', 'sh-builtin'],
    ['\\b(?:fn|let|mut|const|static|if|else|match|loop|while|for|in|break|continue|return|struct|enum|trait|impl|type|where|pub|crate|mod|use|as|ref|self|super|unsafe|async|await|move|dyn|extern)\\b', 'sh-keyword'],
    ['\\b(?:i8|i16|i32|i64|i128|isize|u8|u16|u32|u64|u128|usize|f32|f64|bool|char|str|String|Vec|Box|Rc|Arc|Option|Result|Some|None|Ok|Err|Self)\\b', 'sh-type'],
    ['\\b(?:println!|print!|format!|vec!|panic!|assert!|assert_eq!|assert_ne!|todo!|unimplemented!|unreachable!|dbg!|cfg!)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?[\\d_]+)?(?:_?(?:i|u|f)(?:8|16|32|64|128|size))?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*[!]?\\s*\\()', 'sh-function'],
  ];

  const LANG_C = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['#\\s*(?:include|define|ifdef|ifndef|endif|if|else|elif|undef|pragma|error|warning)[^\n]*', 'sh-decorator'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\\b(?:NULL|true|false|TRUE|FALSE)\\b', 'sh-builtin'],
    ['\\b(?:if|else|for|while|do|switch|case|default|break|continue|return|goto|struct|union|enum|typedef|sizeof|static|extern|inline|volatile|const|register|auto|signed|unsigned|restrict|_Bool|_Complex|_Imaginary)\\b', 'sh-keyword'],
    ['\\b(?:void|int|char|short|long|float|double|size_t|ssize_t|ptrdiff_t|intptr_t|uintptr_t|int8_t|int16_t|int32_t|int64_t|uint8_t|uint16_t|uint32_t|uint64_t|bool|FILE|string|vector|map|set|shared_ptr|unique_ptr|weak_ptr|pair|tuple|optional|variant|array|span|string_view)\\b', 'sh-type'],
    ['\\b(?:printf|scanf|malloc|calloc|realloc|free|memcpy|memset|strlen|strcmp|strcpy|strcat|fprintf|sprintf|snprintf|fopen|fclose|fread|fwrite|exit|abort|assert|std|cout|cin|cerr|endl)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F]+[uUlL]*|0b[01]+[uUlL]*|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[fFlLuU]*)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_RUBY = [
    ['#[^\n]*', 'sh-comment'],
    ['=begin[\\s\\S]*?=end', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\/(?:[^/\\\\\\n]|\\\\.)+\/[imxo]*', 'sh-regex'],
    [':[a-zA-Z_]\\w*', 'sh-builtin'],
    ['\\b(?:true|false|nil|self)\\b', 'sh-builtin'],
    ['\\b(?:def|class|module|end|if|elsif|else|unless|case|when|while|until|for|do|begin|rescue|ensure|raise|return|yield|block_given\\?|then|include|extend|require|require_relative|attr_reader|attr_writer|attr_accessor|public|private|protected|super|lambda|proc)\\b', 'sh-keyword'],
    ['\\b(?:puts|print|p|gets|chomp|each|map|select|reject|reduce|inject|collect|detect|find|any\\?|all\\?|none\\?|sort|sort_by|freeze|frozen\\?|dup|clone|to_s|to_i|to_f|to_a|to_h|new|initialize)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|\\d[\\d_]*(?:\\.\\d[\\d_]*)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['@{1,2}[a-zA-Z_]\\w*', 'sh-variable'],
    ['\\$[a-zA-Z_]\\w*', 'sh-variable'],
    ['\\b[a-zA-Z_]\\w*[?!]?(?=\\s*[\\(])', 'sh-function'],
  ];

  const LANG_PHP = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['#[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\\$[a-zA-Z_]\\w*', 'sh-variable'],
    ['\\b(?:true|false|null|TRUE|FALSE|NULL)\\b', 'sh-builtin'],
    ['\\b(?:function|return|if|else|elseif|for|foreach|while|do|switch|case|break|continue|default|class|extends|implements|interface|abstract|final|public|private|protected|static|new|try|catch|finally|throw|use|namespace|require|include|require_once|include_once|echo|print|isset|unset|empty|array|list|match|fn|yield|const|var|global|as|instanceof)\\b', 'sh-keyword'],
    ['\\b(?:0x[0-9a-fA-F]+|0b[01]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_HTML = [
    ['<!--[\\s\\S]*?-->', 'sh-comment'],
    ['"(?:[^"]*)"', 'sh-string'],
    ["'(?:[^']*)'", 'sh-string'],
    ['<\\/?[a-zA-Z][\\w-]*', 'sh-tag'],
    ['\\/?>', 'sh-tag'],
    ['\\b[a-zA-Z][\\w-]*(?=\\s*=)', 'sh-attr'],
    ['&[a-zA-Z]+;|&#\\d+;|&#x[0-9a-fA-F]+;', 'sh-builtin'],
  ];

  const LANG_CSS = [
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['@(?:media|keyframes|import|charset|font-face|supports|layer|container|property|scope|starting-style)\\b', 'sh-keyword'],
    ['[.#][a-zA-Z_][\\w-]*', 'sh-selector'],
    ['::?[a-zA-Z][\\w-]*', 'sh-decorator'],
    ['\\b(?:important|inherit|initial|unset|revert|none|auto|normal)\\b', 'sh-builtin'],
    ['(?:^|[{;])\\s*[a-zA-Z-]+(?=\\s*:)', 'sh-property'],
    ['#[0-9a-fA-F]{3,8}\\b', 'sh-number'],
    ['\\b\\d+(?:\\.\\d+)?(?:px|em|rem|%|vh|vw|vmin|vmax|ch|ex|fr|s|ms|deg|rad|turn)?\\b', 'sh-number'],
    ['\\b[a-zA-Z-]+(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_SQL = [
    ['--[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ['\\b(?:SELECT|FROM|WHERE|AND|OR|NOT|IN|EXISTS|BETWEEN|LIKE|IS|NULL|AS|ON|JOIN|LEFT|RIGHT|INNER|OUTER|FULL|CROSS|NATURAL|UNION|ALL|DISTINCT|GROUP|BY|ORDER|ASC|DESC|HAVING|LIMIT|OFFSET|INSERT|INTO|VALUES|UPDATE|SET|DELETE|CREATE|ALTER|DROP|TABLE|INDEX|VIEW|DATABASE|SCHEMA|IF|THEN|ELSE|END|CASE|WHEN|WITH|RECURSIVE|OVER|PARTITION|ROW_NUMBER|RANK|DENSE_RANK|WINDOW|ROWS|RANGE|PRECEDING|FOLLOWING|UNBOUNDED|CURRENT|ROW|PRIMARY|KEY|FOREIGN|REFERENCES|CONSTRAINT|UNIQUE|CHECK|DEFAULT|NOT|AUTO_INCREMENT|CASCADE|TRUNCATE|REPLACE|MERGE|EXCEPT|INTERSECT|FETCH|NEXT|FIRST|LAST|NULLS|LATERAL|UNNEST|TABLESAMPLE|EXPLAIN|ANALYZE|GRANT|REVOKE|COMMIT|ROLLBACK|BEGIN|TRANSACTION)\\b', 'sh-keyword'],
    ['\\b(?:select|from|where|and|or|not|in|exists|between|like|is|null|as|on|join|left|right|inner|outer|full|cross|natural|union|all|distinct|group|by|order|asc|desc|having|limit|offset|insert|into|values|update|set|delete|create|alter|drop|table|index|view|database|schema|if|then|else|end|case|when|with|recursive|over|partition|row_number|rank|dense_rank|window|rows|range|preceding|following|unbounded|current|row|primary|key|foreign|references|constraint|unique|check|default|auto_increment|cascade|truncate|replace|merge|except|intersect|fetch|next|first|last|nulls|lateral|unnest|tablesample|explain|analyze|grant|revoke|commit|rollback|begin|transaction)\\b', 'sh-keyword'],
    ['\\b(?:INT|INTEGER|BIGINT|SMALLINT|TINYINT|FLOAT|DOUBLE|DECIMAL|NUMERIC|REAL|VARCHAR|CHAR|TEXT|BLOB|CLOB|DATE|TIME|TIMESTAMP|DATETIME|BOOLEAN|BOOL|SERIAL|UUID|JSON|JSONB|ARRAY|BYTEA|INTERVAL|MONEY|POINT|LINE|POLYGON|INET|CIDR|MACADDR|BIT|VARBIT|XML|ENUM|STRUCT|MAP|ROW)\\b', 'sh-type'],
    ['\\b(?:int|integer|bigint|smallint|tinyint|float|double|decimal|numeric|real|varchar|char|text|blob|clob|date|time|timestamp|datetime|boolean|bool|serial|uuid|json|jsonb|array|bytea|interval|money)\\b', 'sh-type'],
    ['\\b(?:COUNT|SUM|AVG|MIN|MAX|COALESCE|NULLIF|CAST|CONVERT|CONCAT|SUBSTRING|TRIM|UPPER|LOWER|LENGTH|REPLACE|ROUND|FLOOR|CEIL|ABS|MOD|POWER|SQRT|NOW|CURRENT_DATE|CURRENT_TIMESTAMP|DATE_TRUNC|DATE_PART|EXTRACT|TO_CHAR|TO_DATE|TO_NUMBER|STRING_AGG|ARRAY_AGG|LISTAGG|NVL|DECODE|GREATEST|LEAST|IF|IFF|DATEDIFF|DATEADD)\\b', 'sh-function'],
    ['\\b(?:count|sum|avg|min|max|coalesce|nullif|cast|convert|concat|substring|trim|upper|lower|length|replace|round|floor|ceil|abs|mod|power|sqrt|now|current_date|current_timestamp|date_trunc|date_part|extract|to_char|to_date|to_number|string_agg|array_agg|listagg|nvl|decode|greatest|least|if|iff|datediff|dateadd)\\b', 'sh-function'],
    ['\\b(?:TRUE|FALSE|true|false)\\b', 'sh-builtin'],
    ['\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b', 'sh-number'],
  ];

  const LANG_BASH = [
    ['#[^\n]*', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'[^']*'", 'sh-string'],
    ['\\$\\{[^}]+\\}', 'sh-variable'],
    ['\\$[a-zA-Z_]\\w*', 'sh-variable'],
    ['\\$[0-9@#?!$*-]', 'sh-variable'],
    ['\\b(?:if|then|else|elif|fi|for|while|until|do|done|case|esac|in|function|return|exit|break|continue|select|time|coproc)\\b', 'sh-keyword'],
    ['\\b(?:echo|printf|read|cd|ls|pwd|mkdir|rmdir|rm|cp|mv|cat|grep|sed|awk|find|sort|uniq|wc|head|tail|cut|tr|tee|xargs|chmod|chown|chgrp|ln|tar|gzip|gunzip|zip|unzip|curl|wget|ssh|scp|rsync|git|make|sudo|source|export|eval|exec|set|unset|shift|test|true|false|local|declare|typeset|readonly|let|expr|bc|date|sleep|kill|trap|wait|jobs|bg|fg|nohup|nice|renice|pipe|mkfifo|diff|patch|touch|stat|file|which|whereis|type|alias|unalias)\\b', 'sh-builtin'],
    ['\\b\\d+(?:\\.\\d+)?\\b', 'sh-number'],
    ['[|&;><]{1,2}', 'sh-keyword'],
  ];

  const LANG_JSON = [
    ['"(?:[^"\\\\]|\\\\.)*"\\s*(?=:)', 'sh-property'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ['\\b(?:true|false|null)\\b', 'sh-builtin'],
    ['-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b', 'sh-number'],
  ];

  const LANG_YAML = [
    ['#[^\n]*', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['^\\s*[a-zA-Z_][\\w.-]*(?=\\s*:)', 'sh-property'],
    ['\\b(?:true|false|yes|no|null|~)\\b', 'sh-builtin'],
    ['-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b', 'sh-number'],
    ['<<|[&*][a-zA-Z_]\\w*', 'sh-variable'],
  ];

  const LANG_DIFF = [
    ['^\\+\\+\\+[^\n]*', 'sh-diff-header'],
    ['^---[^\n]*', 'sh-diff-header'],
    ['^@@[^\n]*@@', 'sh-diff-header'],
    ['^\\+[^\n]*', 'sh-inserted'],
    ['^-[^\n]*', 'sh-deleted'],
    ['^diff[^\n]*', 'sh-diff-header'],
    ['^index[^\n]*', 'sh-diff-header'],
  ];

  const LANG_DOCKERFILE = [
    ['#[^\n]*', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'[^']*'", 'sh-string'],
    ['\\b(?:FROM|RUN|CMD|LABEL|MAINTAINER|EXPOSE|ENV|ADD|COPY|ENTRYPOINT|VOLUME|USER|WORKDIR|ARG|ONBUILD|STOPSIGNAL|HEALTHCHECK|SHELL|AS)\\b', 'sh-keyword'],
    ['\\$\\{[^}]+\\}', 'sh-variable'],
    ['\\$[a-zA-Z_]\\w*', 'sh-variable'],
  ];

  const LANG_MAKEFILE = [
    ['#[^\n]*', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'[^']*'", 'sh-string'],
    ['^[a-zA-Z_][\\w.-]*(?=\\s*[:+?]?=)', 'sh-variable'],
    ['^[a-zA-Z_][\\w./-]*(?=\\s*:)', 'sh-function'],
    ['\\$[({][^)}]+[)}]', 'sh-variable'],
    ['\\$[@<^?*%+]', 'sh-variable'],
    ['\\b(?:\\.PHONY|\\.DEFAULT|\\.PRECIOUS|\\.INTERMEDIATE|\\.SECONDARY|\\.SUFFIXES|\\.DELETE_ON_ERROR|\\.EXPORT_ALL_VARIABLES)\\b', 'sh-keyword'],
    ['\\b(?:ifeq|ifneq|ifdef|ifndef|else|endif|define|endef|include|-include|override|export|unexport|vpath)\\b', 'sh-keyword'],
  ];

  const LANG_TOML = [
    ['#[^\n]*', 'sh-comment'],
    ['"""[\\s\\S]*?"""', 'sh-string'],
    ["'''[\\s\\S]*?'''", 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'[^']*'", 'sh-string'],
    ['\\[[a-zA-Z_][\\w.-]*\\]', 'sh-selector'],
    ['\\[\\[[a-zA-Z_][\\w.-]*\\]\\]', 'sh-selector'],
    ['[a-zA-Z_][\\w-]*(?=\\s*=)', 'sh-property'],
    ['\\b(?:true|false)\\b', 'sh-builtin'],
    ['-?\\b\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?\\b', 'sh-number'],
    ['\\d{4}-\\d{2}-\\d{2}(?:T\\d{2}:\\d{2}:\\d{2}(?:\\.\\d+)?(?:Z|[+-]\\d{2}:\\d{2})?)?', 'sh-number'],
  ];

  const LANG_SWIFT = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"""[\\s\\S]*?"""', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:true|false|nil|self|Self)\\b', 'sh-builtin'],
    ['\\b(?:func|var|let|if|else|guard|switch|case|default|for|in|while|repeat|return|break|continue|fallthrough|throw|throws|rethrows|try|catch|do|import|class|struct|enum|protocol|extension|typealias|associatedtype|init|deinit|subscript|operator|precedencegroup|where|as|is|super|convenience|required|override|mutating|nonmutating|static|dynamic|lazy|final|weak|unowned|optional|indirect|infix|prefix|postfix|open|public|internal|fileprivate|private|some|any|async|await|actor|nonisolated|isolated|consuming|borrowing)\\b', 'sh-keyword'],
    ['\\b(?:Int|UInt|Float|Double|Bool|String|Character|Array|Dictionary|Set|Optional|Result|Error|Codable|Encodable|Decodable|Hashable|Equatable|Comparable|CustomStringConvertible|Sequence|Collection|IteratorProtocol)\\b', 'sh-type'],
    ['\\b(?:0x[0-9a-fA-F_]+|0b[01_]+|0o[0-7_]+|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?[\\d_]+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_KOTLIN = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"""[\\s\\S]*?"""', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['@[a-zA-Z_]\\w*', 'sh-decorator'],
    ['\\b(?:true|false|null|this|super)\\b', 'sh-builtin'],
    ['\\b(?:fun|val|var|class|object|interface|enum|sealed|data|inner|companion|abstract|open|override|private|protected|public|internal|final|annotation|suspend|tailrec|inline|infix|operator|external|if|else|when|for|while|do|return|break|continue|throw|try|catch|finally|is|as|in|out|by|where|init|constructor|get|set|import|package|typealias|reified|crossinline|noinline|vararg|lateinit|const|expect|actual|field|delegate)\\b', 'sh-keyword'],
    ['\\b(?:Int|Long|Short|Byte|Float|Double|Boolean|Char|String|Unit|Nothing|Any|Array|List|Map|Set|MutableList|MutableMap|MutableSet|Pair|Triple|Sequence|Iterable|Collection|Comparable)\\b', 'sh-type'],
    ['\\b(?:0x[0-9a-fA-F_]+[lL]?|0b[01_]+[lL]?|\\d[\\d_]*(?:\\.[\\d_]+)?(?:[eE][+-]?[\\d_]+)?[fFdDlL]?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_LUA = [
    ['--\\[\\[[\\s\\S]*?\\]\\]', 'sh-comment'],
    ['--[^\n]*', 'sh-comment'],
    ['\\[\\[[\\s\\S]*?\\]\\]', 'sh-string'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\\b(?:true|false|nil|self)\\b', 'sh-builtin'],
    ['\\b(?:and|break|do|else|elseif|end|for|function|goto|if|in|local|not|or|repeat|return|then|until|while)\\b', 'sh-keyword'],
    ['\\b(?:print|type|tostring|tonumber|error|pcall|xpcall|assert|select|unpack|rawget|rawset|setmetatable|getmetatable|pairs|ipairs|next|require|dofile|loadfile|load|coroutine|string|table|math|io|os|debug)\\b', 'sh-builtin'],
    ['\\b(?:0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANG_R = [
    ['#[^\n]*', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['\\b(?:TRUE|FALSE|NULL|NA|NA_integer_|NA_real_|NA_complex_|NA_character_|Inf|NaN)\\b', 'sh-builtin'],
    ['\\b(?:if|else|for|while|repeat|in|next|break|return|function|switch|tryCatch|stop|warning|message|library|require|source)\\b', 'sh-keyword'],
    ['\\b(?:c|list|matrix|array|data\\.frame|vector|factor|length|nrow|ncol|dim|names|str|summary|print|cat|paste|paste0|sprintf|grep|gsub|sub|strsplit|nchar|substr|which|match|merge|rbind|cbind|apply|sapply|lapply|tapply|mapply|do\\.call|Reduce|Filter|Map|ifelse|seq|rep|rev|sort|order|unique|table|sum|mean|median|sd|var|max|min|range|abs|sqrt|log|exp|round|ceiling|floor|as\\.numeric|as\\.character|as\\.integer|as\\.logical|is\\.na|is\\.null|is\\.numeric|is\\.character|class|typeof|inherits)\\b', 'sh-function'],
    ['\\b(?:0x[0-9a-fA-F]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?[iL]?)\\b', 'sh-number'],
    ['<-|->|<<-|->>|%%|%\\*%|%in%|%o%|%/%', 'sh-keyword'],
  ];

  const LANG_GENERIC = [
    ['\/\/[^\n]*', 'sh-comment'],
    ['#[^\n]*', 'sh-comment'],
    ['\/\\*[\\s\\S]*?\\*\/', 'sh-comment'],
    ['"(?:[^"\\\\]|\\\\.)*"', 'sh-string'],
    ["'(?:[^'\\\\]|\\\\.)*'", 'sh-string'],
    ['`(?:[^`\\\\]|\\\\.)*`', 'sh-string'],
    ['\\b(?:true|false|null|nil|none|undefined|True|False|None|NULL)\\b', 'sh-builtin'],
    ['\\b(?:if|else|elif|elseif|for|while|do|switch|case|default|break|continue|return|function|func|def|fn|class|struct|enum|interface|trait|impl|type|var|let|const|val|mut|static|new|this|self|super|import|export|from|as|try|catch|finally|throw|raise|with|yield|async|await|public|private|protected|abstract|override|virtual|extends|implements|package|module|use|require|include)\\b', 'sh-keyword'],
    ['\\b(?:0x[0-9a-fA-F]+|0b[01]+|0o[0-7]+|\\d+(?:\\.\\d+)?(?:[eE][+-]?\\d+)?)\\b', 'sh-number'],
    ['\\b[a-zA-Z_]\\w*(?=\\s*\\()', 'sh-function'],
  ];

  const LANGUAGES = {
    javascript: LANG_JS, js: LANG_JS, jsx: LANG_JS,
    typescript: LANG_JS, ts: LANG_JS, tsx: LANG_JS,
    python: LANG_PYTHON, py: LANG_PYTHON,
    java: LANG_JAVA,
    scala: LANG_SCALA,
    kotlin: LANG_KOTLIN, kt: LANG_KOTLIN,
    go: LANG_GO, golang: LANG_GO,
    rust: LANG_RUST, rs: LANG_RUST,
    c: LANG_C, cpp: LANG_C, 'c++': LANG_C, h: LANG_C, hpp: LANG_C, cc: LANG_C, cxx: LANG_C,
    ruby: LANG_RUBY, rb: LANG_RUBY,
    php: LANG_PHP,
    html: LANG_HTML, xml: LANG_HTML, svg: LANG_HTML, htm: LANG_HTML,
    css: LANG_CSS, scss: LANG_CSS, less: LANG_CSS, sass: LANG_CSS,
    sql: LANG_SQL, mysql: LANG_SQL, postgresql: LANG_SQL, pgsql: LANG_SQL, plsql: LANG_SQL, hive: LANG_SQL, presto: LANG_SQL,
    bash: LANG_BASH, sh: LANG_BASH, shell: LANG_BASH, zsh: LANG_BASH,
    json: LANG_JSON, jsonc: LANG_JSON,
    yaml: LANG_YAML, yml: LANG_YAML,
    diff: LANG_DIFF, patch: LANG_DIFF,
    dockerfile: LANG_DOCKERFILE, docker: LANG_DOCKERFILE,
    makefile: LANG_MAKEFILE, make: LANG_MAKEFILE,
    toml: LANG_TOML,
    swift: LANG_SWIFT,
    lua: LANG_LUA,
    r: LANG_R,
  };

  function highlight(code, lang) {
    const langKey = (lang || '').toLowerCase().trim();
    const rules = LANGUAGES[langKey];
    if (!rules) {
      if (langKey) {
        return highlightWithRules(code, LANG_GENERIC);
      }
      return escapeHtml(code);
    }
    return highlightWithRules(code, rules);
  }

  function highlightWithRules(code, rules) {
    const flags = rules === LANG_DIFF ? 'gm' : 'g';
    const combined = new RegExp(rules.map(r => `(${r[0]})`).join('|'), flags);
    let result = '';
    let lastIndex = 0;
    let match;

    while ((match = combined.exec(code)) !== null) {
      if (match.index > lastIndex) {
        result += escapeHtml(code.slice(lastIndex, match.index));
      }
      for (let i = 0; i < rules.length; i++) {
        if (match[i + 1] !== undefined) {
          result += `<span class="${rules[i][1]}">${escapeHtml(match[0])}</span>`;
          break;
        }
      }
      lastIndex = combined.lastIndex;
      if (match[0].length === 0) {
        combined.lastIndex++;
        lastIndex = combined.lastIndex;
      }
    }

    if (lastIndex < code.length) {
      result += escapeHtml(code.slice(lastIndex));
    }
    return result;
  }

  return { highlight, supportedLanguages: () => Object.keys(LANGUAGES) };
})();
