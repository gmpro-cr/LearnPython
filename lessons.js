// PyQuest curriculum.
// Each exercise has a hidden Python `check` that runs in the learner's
// namespace after their code. `_stdout` holds their printed output and
// `_code` holds their source. AssertionError messages are shown as feedback.

const XP_PER_EXERCISE = 10;

const LEVELS = [
  { at: 0,   name: "Hatchling" },
  { at: 60,  name: "Slitherer" },
  { at: 140, name: "Snake Charmer" },
  { at: 240, name: "Serpent Sage" },
  { at: 340, name: "Pythonista" },
  { at: 450, name: "Code Conjurer" },
  { at: 560, name: "Python Master" },
];

// Track boundaries by stage index, used for sidebar grouping.
const TRACKS = [
  { name: "Foundations", from: 0, to: 8 },
  { name: "Intermediate", from: 9, to: 13 },
  { name: "Expert", from: 14, to: 19 },
];

const STAGES = [

  // ---------------------------------------------------------------- Stage 1
  {
    id: "hello",
    name: "Hello, Python",
    badge: { label: "First Words", color: "green" },
    intro: [
      `<p>Welcome! <strong>Python</strong> is one of the most popular computer languages in the world. Apps like Instagram and YouTube use it every day. Best part: you will run real Python right here, on this page.</p>`,
      `<p>Your first skill: make the computer show a message. For this we use <code>print()</code>. Write your text inside the brackets, wrapped in quotes.</p>`,
      `<pre class="code-example">print("Chai is ready")
<span class="out">Chai is ready</span></pre>`,
      `<p>The quotes tell Python: this is text, not a command. Text inside quotes is called a <strong>string</strong>. If you forget a quote, Python shows an error. Do not worry — errors are normal. Every programmer sees them daily.</p>`,
    ],
    exercises: [
      {
        id: "hello-1",
        title: "Break the silence",
        brief: `Every programmer's first program: make Python print exactly <code>Hello, World!</code> — capital H, capital W, a comma, and an exclamation mark.`,
        starter: `# Type your line below, then press Run\n`,
        check: `assert _stdout.strip() != "", "Nothing was printed. Use print(\\"Hello, World!\\") — with the quotes."\nassert "hello, world!" in _stdout.lower(), "Almost — the text must be exactly: Hello, World!"`,
        hint: `Write print("Hello, World!") on its own line. Quotes and parentheses both matter.`,
      },
      {
        id: "hello-2",
        title: "Introduce yourself",
        brief: `Now your turn. Print one line that has your name in it — for example <code>My name is Gaurav</code>.`,
        starter: `# Print a sentence with your name in it\n`,
        check: `assert _stdout.strip() != "", "Nothing was printed yet. Use print() with your sentence in quotes."\nassert len(_stdout.strip()) >= 3, "Print a full sentence with your name in it."\nassert "print" in _code, "Use the print() function to display your sentence."`,
        hint: `Same trick as before: print("My name is ...") — put any sentence you like inside the quotes.`,
      },
      {
        id: "hello-3",
        title: "One line is never enough",
        brief: `Each <code>print()</code> makes a new line. Print <strong>three lines</strong>: your city, your favourite food, and one thing you want to build with Python.`,
        starter: `# Three print() calls, three lines\n`,
        check: `_lines = [l for l in _stdout.split("\\n") if l.strip()]\nassert len(_lines) >= 3, "I only see " + str(len(_lines)) + " line(s). Use three separate print() calls."`,
        hint: `Write print("...") three times, each on its own line. Each call prints on a new line automatically.`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 2
  {
    id: "variables",
    name: "Variables & Numbers",
    badge: { label: "Box Keeper", color: "blue" },
    intro: [
      `<p>A <strong>variable</strong> is like a box with a name on it. You keep a value inside. Making one is simple: a name, an equals sign, and a value.</p>`,
      `<pre class="code-example">cups_of_chai = 3
price = 15
print(cups_of_chai * price)
<span class="out">45</span></pre>`,
      `<p>See — numbers have no quotes. Quotes make text; plain digits make numbers you can do maths with: <code>+</code> add, <code>-</code> subtract, <code>*</code> multiply, <code>/</code> divide, <code>**</code> power.</p>`,
      `<p>You can also <strong>update</strong> a variable. <code>score = score + 5</code> means: take the old score, add 5, and store the new value back in the same box.</p>`,
    ],
    exercises: [
      {
        id: "var-1",
        title: "Label your first box",
        brief: `Make a variable called <code>age</code>. Store your age in it as a number (no quotes). Then print it.`,
        starter: `# Create the variable, then print it\n`,
        check: `assert "age" in dir(), "I don't see a variable called age yet. Create it with: age = <a number>"\nassert isinstance(age, (int, float)), "age should be a number — write it without quotes."\nassert "print(" in _code, "Now print it with print(age) — no quotes around age."`,
        hint: `Two lines: first age = 30 (your real age, no quotes), then print(age).`,
      },
      {
        id: "var-2",
        title: "The answer to everything",
        brief: `Make a variable <code>total</code> that holds the answer of <code>7 * 6</code>. Let Python do the maths — do not type 42 yourself. Then print it.`,
        starter: `# total should be calculated, not typed\n`,
        check: `assert "total" in dir(), "Create a variable called total first."\nassert total == 42, "total should equal 7 * 6. Let Python multiply them for you."\nassert "42" not in _code, "No cheating — write 7 * 6 and let Python calculate it."`,
        hint: `total = 7 * 6 then print(total). The * symbol is how Python multiplies.`,
      },
      {
        id: "var-3",
        title: "Level up the score",
        brief: `A game starts with <code>score = 10</code>. The player wins 5 more points. Update <code>score</code> using its old value, then print it. It should show 15.`,
        starter: `score = 10\n# now add 5 to score, then print it\n`,
        check: `assert "score" in dir(), "Keep the score variable — it should still exist."\nassert score == 15, "score should end up as 15. Update it with: score = score + 5"\nassert "15" not in _code, "Don't type 15 directly — build it from the old score: score = score + 5"`,
        hint: `score = score + 5 reads as: new score is old score plus five. Then print(score).`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 3
  {
    id: "strings",
    name: "Strings & f-strings",
    badge: { label: "Wordsmith", color: "yellow" },
    intro: [
      `<p>Strings are pieces of text. The most useful trick in this stage is the <strong>f-string</strong> — a string that can pull your variables inside it.</p>`,
      `<pre class="code-example">name = "Asha"
print(f"Good morning, {name}!")
<span class="out">Good morning, Asha!</span></pre>`,
      `<p>Put the letter <code>f</code> before the quote. Then anything inside <code>{curly braces}</code> is replaced by its value. Simple and clean.</p>`,
      `<p>Strings also come with built-in tools called <strong>methods</strong>. <code>"hi".upper()</code> gives <code>"HI"</code>. And <code>len("hi")</code> tells you the text has 2 letters.</p>`,
    ],
    exercises: [
      {
        id: "str-1",
        title: "The personalised greeting",
        brief: `Store any name in a variable <code>name</code>. Then use an <strong>f-string</strong> to print <code>Hello, &lt;name&gt;!</code> — the name must come from the variable.`,
        starter: `name = "Asha"\n# print a greeting using an f-string\n`,
        check: `assert "name" in dir(), "Keep the name variable."\nassert "f\\"" in _code or "f'" in _code, "Use an f-string: it starts with the letter f before the quote."\nassert name in _stdout, "The printed line should contain the name from your variable — put {name} inside the f-string."\nassert "hello" in _stdout.lower(), "The greeting should say Hello."`,
        hint: `print(f"Hello, {name}!") — the f before the quote and the curly braces do the work.`,
      },
      {
        id: "str-2",
        title: "Turn up the volume",
        brief: `Take the string <code>"python is fun"</code> and call <code>.upper()</code> on it. Store the result in <code>shout</code> and print it.`,
        starter: `quiet = "python is fun"\n# make it LOUD\n`,
        check: `assert "shout" in dir(), "Create a variable called shout."\nassert shout == "PYTHON IS FUN", "shout should be the upper-case version. Call .upper() on the string."\nassert ".upper()" in _code, "Use the .upper() method rather than typing capitals yourself."`,
        hint: `shout = quiet.upper() then print(shout). Methods attach to values with a dot.`,
      },
      {
        id: "str-3",
        title: "Count the letters",
        brief: `How many letters are in <code>"beautiful"</code>? Use <code>len()</code> to count, store the answer in <code>count</code>, and print it.`,
        starter: `word = "beautiful"\n# measure it\n`,
        check: `assert "count" in dir(), "Create a variable called count."\nassert count == 9, "count should be 9 — use len(word) to measure the string."\nassert "len(" in _code, "Use the len() function to do the counting."`,
        hint: `count = len(word) then print(count). len() works on any string — and later, on lists too.`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 4
  {
    id: "decisions",
    name: "Making Decisions",
    badge: { label: "Fork Master", color: "red" },
    intro: [
      `<p>Programs become smart when they can <strong>choose</strong>. The <code>if</code> statement runs its code only when a condition is true. The <code>else</code> part runs when it is not.</p>`,
      `<pre class="code-example">temperature = 41
if temperature > 40:
    print("Stay inside")
else:
    print("Nice day for a walk")
<span class="out">Stay inside</span></pre>`,
      `<p>Two things matter here. The <strong>colon</strong> at the end of the <code>if</code> line, and the <strong>four spaces</strong> before the next line. The spaces tell Python which lines belong to the if.</p>`,
      `<p>Need more than two choices? Use <code>elif</code> (short for "else if"). Also useful: <code>%</code> gives the remainder after division. <code>7 % 2</code> is <code>1</code>, so 7 is an odd number.</p>`,
    ],
    exercises: [
      {
        id: "if-1",
        title: "The Pune weather check",
        brief: `The temperature is 35. Write an if/else that prints <code>Hot</code> when the temperature is above 30, and <code>Pleasant</code> when it is not.`,
        starter: `temperature = 35\n# your if/else here\n`,
        check: `assert "if" in _code, "Use an if statement to make the decision."\nassert "hot" in _stdout.lower(), "With temperature = 35, your code should print Hot. Check your condition: temperature > 30"\nassert "pleasant" not in _stdout.lower(), "Only one branch should run — Hot, since 35 is above 30."`,
        hint: `if temperature > 30: then an indented print("Hot"); else: then an indented print("Pleasant").`,
      },
      {
        id: "if-2",
        title: "Odd one out",
        brief: `The number is 7. Print <code>odd</code> if it is odd, and <code>even</code> if it is even. Use <code>%</code> — an even number gives <code>number % 2 == 0</code>.`,
        starter: `number = 7\n# odd or even?\n`,
        check: `assert "%" in _code, "Use the % operator to check the remainder when dividing by 2."\nassert "odd" in _stdout.lower(), "7 is odd, so your code should print odd."\nassert "even" not in _stdout.lower().replace("odd",""), "Only the odd branch should run for 7."`,
        hint: `if number % 2 == 0: print("even") else: print("odd"). Note the double equals — == compares, = assigns.`,
      },
      {
        id: "if-3",
        title: "The grade machine",
        brief: `The marks are 91. Print <code>A</code> for 90 and above, <code>B</code> for 75 to 89, and <code>C</code> for anything lower. You will need <code>elif</code>.`,
        starter: `marks = 91\n# A, B or C?\n`,
        check: `assert "elif" in _code, "Use elif for the middle band — if, elif, else."\nassert _stdout.strip().upper() == "A", "With marks = 91 the output should be exactly A."`,
        hint: `if marks >= 90: print("A"), elif marks >= 75: print("B"), else: print("C").`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 5
  {
    id: "loops",
    name: "Loops",
    badge: { label: "Repeater", color: "blue" },
    intro: [
      `<p>Computers are very good at repeating work. A <strong>for loop</strong> runs the same block of code again and again — once for each item.</p>`,
      `<pre class="code-example">for i in range(3):
    print(i)
<span class="out">0
1
2</span></pre>`,
      `<p><code>range(3)</code> gives the numbers 0, 1, 2. Python counts from zero and stops <em>before</em> the number you give. The lines with spaces in front run once for every value.</p>`,
      `<p>A very common pattern: start a <code>total</code> at 0, then add to it inside the loop. This is how programs add up bills, marks and scores.</p>`,
    ],
    exercises: [
      {
        id: "loop-1",
        title: "Count like a computer",
        brief: `Use a for loop with <code>range(5)</code> to print the numbers 0 to 4, one on each line.`,
        starter: `# one loop, five lines of output\n`,
        check: `assert "for" in _code and "range" in _code, "Use a for loop with range(5)."\n_lines = [l.strip() for l in _stdout.split("\\n") if l.strip()]\nassert _lines == ["0","1","2","3","4"], "Expected the lines 0 1 2 3 4. Remember range(5) starts at 0 and stops before 5."`,
        hint: `for i in range(5): then an indented print(i). The loop variable i takes each value in turn.`,
      },
      {
        id: "loop-2",
        title: "The snack parade",
        brief: `A list is a row of values: <code>snacks = ["samosa", "vada pav", "jalebi"]</code>. Loop over it and print each snack on its own line.`,
        starter: `snacks = ["samosa", "vada pav", "jalebi"]\n# print each one\n`,
        check: `assert "for" in _code, "Use a for loop — it works directly on lists."\nassert "samosa" in _stdout and "vada pav" in _stdout and "jalebi" in _stdout, "All three snacks should be printed."\n_lines = [l for l in _stdout.split("\\n") if l.strip()]\nassert len(_lines) >= 3, "Each snack should be on its own line — print inside the loop."`,
        hint: `for snack in snacks: then print(snack). No range() needed — Python walks the list for you.`,
      },
      {
        id: "loop-3",
        title: "The accumulator",
        brief: `Add the numbers 1 to 10 using a loop. Start with <code>total = 0</code>, add each number inside the loop, then print the total. It should be 55.`,
        starter: `total = 0\n# loop from 1 to 10, adding as you go\n`,
        check: `assert "for" in _code, "Use a for loop to visit each number."\nassert "total" in dir() and total == 55, "total should end at 55. Tip: range(1, 11) gives 1 through 10."\nassert "55" not in _code, "Let the loop do the adding — don't type 55."`,
        hint: `for n in range(1, 11): then total = total + n indented inside. Print total after the loop (unindented).`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 6
  {
    id: "lists",
    name: "Lists",
    badge: { label: "Collector", color: "green" },
    intro: [
      `<p>A <strong>list</strong> keeps many values together, in order, inside square brackets.</p>`,
      `<pre class="code-example">cities = ["Pune", "Mumbai", "Delhi"]
print(cities[0])
cities.append("Goa")
print(len(cities))
<span class="out">Pune
4</span></pre>`,
      `<p>Positions start at <strong>0</strong>: <code>cities[0]</code> is the first item. <code>cities[-1]</code> is the last one. <code>.append()</code> adds a new item at the end. <code>len()</code> counts how many items there are.</p>`,
    ],
    exercises: [
      {
        id: "list-1",
        title: "Pack your palette",
        brief: `Make a list called <code>colors</code> with exactly three colour names. Then print the <strong>first</strong> one using its position.`,
        starter: `# your list of three colors\n`,
        check: `assert "colors" in dir(), "Create a list called colors."\nassert isinstance(colors, list) and len(colors) == 3, "colors should be a list with exactly 3 items in square brackets."\nassert "[0]" in _code, "Print the first item with colors[0] — positions start at zero."`,
        hint: `colors = ["red", "teal", "gold"] then print(colors[0]). The first position is 0, not 1.`,
      },
      {
        id: "list-2",
        title: "Room for one more",
        brief: `Here is a guest list. Use <code>.append()</code> to add one more guest. Then print the whole list.`,
        starter: `guests = ["Ravi", "Meera"]\n# add a third guest, then print the list\n`,
        check: `assert "guests" in dir() and isinstance(guests, list), "Keep the guests list."\nassert len(guests) == 3, "The list should have 3 guests after your append."\nassert ".append(" in _code, "Use the .append() method to add the guest."`,
        hint: `guests.append("Sara") — append changes the list in place. Then print(guests).`,
      },
      {
        id: "list-3",
        title: "The bouncer",
        brief: `The word <code>in</code> checks if something is inside a list. Print <code>welcome</code> if <code>"Priya"</code> is in the VIP list. If not, print <code>sorry</code>.`,
        starter: `vips = ["Arjun", "Priya", "Dev"]\n# is Priya on the list?\n`,
        check: `assert " in " in _code, "Use the in keyword to check membership: \\"Priya\\" in vips"\nassert "welcome" in _stdout.lower(), "Priya is on the list, so this should print welcome."`,
        hint: `if "Priya" in vips: print("welcome") else: print("sorry"). The in keyword returns True or False.`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 7
  {
    id: "dicts",
    name: "Dictionaries",
    badge: { label: "Cartographer", color: "yellow" },
    intro: [
      `<p>A <strong>dictionary</strong> stores pairs: a <em>key</em> and its <em>value</em>. A list answers "what is at position 2?". A dictionary answers "what is the price of a samosa?"</p>`,
      `<pre class="code-example">menu = {"samosa": 20, "chai": 15}
print(menu["chai"])
menu["jalebi"] = 40
<span class="out">15</span></pre>`,
      `<p>Curly braces make the dictionary. A colon joins each key to its value. Square brackets look a value up. Writing <code>menu["jalebi"] = 40</code> adds a new item.</p>`,
    ],
    exercises: [
      {
        id: "dict-1",
        title: "Your profile card",
        brief: `Make a dictionary called <code>profile</code> with two keys: <code>"name"</code> and <code>"city"</code>. Fill in your own details. Print the dictionary.`,
        starter: `# a dictionary with name and city\n`,
        check: `assert "profile" in dir() and isinstance(profile, dict), "Create a dictionary called profile using curly braces."\nassert "name" in profile and "city" in profile, "profile needs both a \\"name\\" key and a \\"city\\" key."`,
        hint: `profile = {"name": "Gaurav", "city": "Pune"} — quotes around keys and text values, colon between them.`,
      },
      {
        id: "dict-2",
        title: "The lookup",
        brief: `Look up the price of <code>"dosa"</code> in the menu using square brackets. Print just that number.`,
        starter: `menu = {"idli": 30, "dosa": 50, "uttapam": 60}\n# print the price of dosa\n`,
        check: `assert '["dosa"]' in _code or "['dosa']" in _code, "Look the price up with menu[\\"dosa\\"] — square brackets on the dictionary."\nassert "50" in _stdout, "The printed price should be 50."`,
        hint: `print(menu["dosa"]) — the key goes in square brackets, and out comes its value.`,
      },
      {
        id: "dict-3",
        title: "Expand the menu",
        brief: `Add <code>"filter coffee"</code> at price <code>25</code> to the menu by writing to a new key. Then print the whole menu.`,
        starter: `menu = {"idli": 30, "dosa": 50}\n# add filter coffee at 25\n`,
        check: `assert "filter coffee" in menu, "Add the key \\"filter coffee\\" — assign to menu[\\"filter coffee\\"]."\nassert menu["filter coffee"] == 25, "filter coffee should cost 25."\nassert len(menu) == 3, "The original items should still be there — just add, don't rebuild."`,
        hint: `menu["filter coffee"] = 25 — assigning to a key that doesn't exist yet creates it.`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 8
  {
    id: "functions",
    name: "Functions",
    badge: { label: "Machinist", color: "red" },
    intro: [
      `<p>A <strong>function</strong> is a small machine you build once and use many times. Values go in, a result comes out. <code>def</code> creates the function. <code>return</code> sends the answer back.</p>`,
      `<pre class="code-example">def double(n):
    return n * 2

print(double(21))
<span class="out">42</span></pre>`,
      `<p><code>n</code> is a <strong>parameter</strong> — an empty slot that gets filled each time you call the function. Note: <code>return</code> is not the same as <code>print</code>. Return hands the value back so your program can use it further.</p>`,
      `<p>A parameter can have a <strong>default</strong> value. <code>def power(base, exp=2)</code> means: if you do not give <code>exp</code>, Python uses 2.</p>`,
    ],
    exercises: [
      {
        id: "fn-1",
        title: "The greeting machine",
        brief: `Write a function <code>greet(name)</code> that <strong>returns</strong> (not prints) the text <code>Hello, &lt;name&gt;!</code>. Then print <code>greet("Ada")</code> to test it.`,
        starter: `# def greet(name): ...\n`,
        check: `assert "greet" in dir() and callable(greet), "Define a function called greet using def."\nassert "return" in _code, "Use return inside the function — not print."\nassert greet("Ada") == "Hello, Ada!", "greet(\\"Ada\\") should return exactly: Hello, Ada!  (an f-string helps)"\nassert greet("Alan") == "Hello, Alan!", "The function should work for any name, not just Ada."`,
        hint: `def greet(name): then return f"Hello, {name}!" indented inside. Then print(greet("Ada")).`,
      },
      {
        id: "fn-2",
        title: "Square deal",
        brief: `Write a function <code>square(n)</code> that returns <code>n</code> multiplied by itself. Print <code>square(4)</code> — it should show 16.`,
        starter: `# build the square machine\n`,
        check: `assert "square" in dir() and callable(square), "Define a function called square."\nassert square(4) == 16, "square(4) should return 16."\nassert square(9) == 81, "square(9) should return 81 — make sure you multiply n by itself."`,
        hint: `def square(n): return n * n. Two lines, and the machine works for every number ever.`,
      },
      {
        id: "fn-3",
        title: "Power with a default",
        brief: `Write <code>power(base, exp=2)</code> that returns <code>base ** exp</code>. Because of the default, <code>power(3)</code> gives 9 and <code>power(2, 3)</code> gives 8. Print both.`,
        starter: `# a function with a default parameter\n`,
        check: `assert "power" in dir() and callable(power), "Define a function called power."\nassert power(3) == 9, "power(3) should use the default exponent 2 and return 9."\nassert power(2, 3) == 8, "power(2, 3) should return 8 — base ** exp does the work."`,
        hint: `def power(base, exp=2): return base ** exp. The ** operator raises to a power.`,
      },
    ],
  },

  // ---------------------------------------------------------------- Stage 9
  {
    id: "capstone",
    name: "Capstone: Chai Shop",
    badge: { label: "Chaiwala", color: "green" },
    intro: [
      `<p>Time to use everything together. You run a small chai shop and you need a billing program — variables, a dictionary, a loop and a function, all in one place.</p>`,
      `<p>Your program gets a <strong>menu</strong> (a dictionary of prices) and an <strong>order</strong> (a list of items). Your job: write a function that goes through the order and adds up the total.</p>`,
      `<pre class="code-example">menu = {"chai": 15, "samosa": 20}
order = ["chai", "chai", "samosa"]
<span class="out"># bill(menu, order) should give 50</span></pre>`,
      `<p>This is real programming — the same shape as the code that totals your cart on any shopping site. Finish it and the Foundations track is complete. The Intermediate track opens next.</p>`,
    ],
    exercises: [
      {
        id: "cap-1",
        title: "The billing engine",
        brief: `Write <code>bill(menu, order)</code>. It should loop over the order, look up each item's price in the menu, and return the full total. Then print the bill for the given order — it should be 105.`,
        starter: `menu = {"chai": 15, "samosa": 20, "jalebi": 40, "filter coffee": 30}
order = ["chai", "samosa", "jalebi", "chai", "chai"]

def bill(menu, order):
    total = 0
    # your loop here
    return total

print(bill(menu, order))
`,
        check: `assert "bill" in dir() and callable(bill), "Keep the bill function."\nassert "for" in _code, "Use a loop to walk through the order."\nassert bill({"chai": 15, "samosa": 20}, ["chai", "chai", "samosa"]) == 50, "bill should total any order — for two chai and one samosa it should return 50."\nassert bill(menu, order) == 105, "For the given order the total should be 105. Add menu[item] to total for each item."\nassert "105" not in _code, "Let the function calculate the total — don't type 105."`,
        hint: `Inside the function: for item in order: then total = total + menu[item] indented. The return is already there.`,
      },
    ],
  },

  // ================================================== INTERMEDIATE TRACK ===

  // --------------------------------------------------------------- Stage 10
  {
    id: "slices",
    name: "Indexes & Slices",
    badge: { label: "Surgeon", color: "blue" },
    intro: [
      `<p>Welcome to the Intermediate track. Strings and lists are <strong>sequences</strong> — ordered rows of items. Python gives you clean tools to cut out any piece you want.</p>`,
      `<pre class="code-example">word = "programming"
print(word[0])      <span class="out"># p — positions start at 0</span>
print(word[-1])     <span class="out"># g — negatives count from the end</span>
print(word[3:7])    <span class="out"># gram — from 3 up to (not including) 7</span></pre>`,
      `<p>A slice <code>[start:stop]</code> takes a part. Leave a side empty to mean "from the start" or "till the end". A third number is the <strong>step</strong> — and <code>[::-1]</code> walks backwards, so it reverses the whole string.</p>`,
    ],
    exercises: [
      {
        id: "slice-1",
        title: "Head and tail",
        brief: `From <code>word</code>, make <code>first</code> hold its first letter and <code>last</code> hold its last letter. Use indexes — including a negative one. Print both.`,
        starter: `word = "programming"\n# first and last characters, by index\n`,
        check: `assert "first" in dir() and "last" in dir(), "Create both variables: first and last."\nassert first == "p", "first should be word[0] — the character p."\nassert last == "g", "last should be the final character g. A negative index counts from the end."\nassert "[-1]" in _code, "Use word[-1] for the last character — that is the idiomatic Python way."`,
        hint: `first = word[0] and last = word[-1]. Negative indexes walk backwards from the end.`,
      },
      {
        id: "slice-2",
        title: "Cut the middle",
        brief: `Cut out <code>middle</code> — the letters of <code>word</code> from position 3 up to (but not including) 7. It should be <code>gram</code>. Print it.`,
        starter: `word = "programming"\n# slice positions 3 to 7\n`,
        check: `assert "middle" in dir(), "Create a variable called middle."\nassert middle == "gram", "middle should be exactly gram — use word[3:7]."\nassert ":" in _code, "Use slice notation with a colon: word[start:stop]."`,
        hint: `middle = word[3:7] — the stop position is not included, which is why 7 grabs up to position 6.`,
      },
      {
        id: "slice-3",
        title: "The reverser",
        brief: `A famous Python trick. Make <code>rev</code> — the whole word written backwards — using a slice with a negative step. Print it.`,
        starter: `word = "programming"\n# reverse it with a slice\n`,
        check: `assert "rev" in dir(), "Create a variable called rev."\nassert rev == "gnimmargorp", "rev should be the word spelled backwards."\nassert "[::-1]" in _code, "Use the classic reversing slice: word[::-1]"`,
        hint: `rev = word[::-1] — empty start, empty stop, step of -1: walk the whole string backwards.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 11
  {
    id: "while",
    name: "While & Logic",
    badge: { label: "Sentinel", color: "yellow" },
    intro: [
      `<p>A <code>for</code> loop runs a fixed number of times. A <strong>while loop</strong> keeps running as long as a condition stays true — useful when you do not know how many rounds you will need.</p>`,
      `<pre class="code-example">fuel = 3
while fuel > 0:
    print(fuel)
    fuel = fuel - 1
<span class="out">3
2
1</span></pre>`,
      `<p>Important: something inside the loop must change the condition, or the loop never ends. You can join conditions with <code>and</code>, <code>or</code> and <code>not</code>. And <code>break</code> lets you leave a loop early, the moment you find what you need.</p>`,
    ],
    exercises: [
      {
        id: "while-1",
        title: "Launch countdown",
        brief: `Use a <code>while</code> loop to print a countdown from 5 to 1, one number on each line.`,
        starter: `count = 5\n# countdown loop here\n`,
        check: `assert "while" in _code, "This one needs a while loop."\n_lines = [l.strip() for l in _stdout.split("\\n") if l.strip()]\nassert _lines == ["5","4","3","2","1"], "Expected 5 4 3 2 1, one per line. Print first, then decrease count inside the loop."`,
        hint: `while count > 0: then print(count) and count = count - 1, both indented. Order matters.`,
      },
      {
        id: "while-2",
        title: "The two-condition bouncer",
        brief: `The club lets you in only if you are 18 or older <strong>and</strong> you have an ID. Print <code>entry allowed</code> or <code>no entry</code>, using one condition joined with <code>and</code>.`,
        starter: `age = 25\nhas_id = True\n# one if, two conditions joined\n`,
        check: `assert " and " in _code, "Join both requirements into one condition using the and keyword."\nassert "entry allowed" in _stdout.lower(), "age 25 with ID should print entry allowed."`,
        hint: `if age >= 18 and has_id: — booleans like has_id can sit directly in a condition, no == True needed.`,
      },
      {
        id: "while-3",
        title: "First over a hundred",
        brief: `Loop through the numbers. Print the <strong>first one bigger than 100</strong>, then stop the loop with <code>break</code>. Nothing after it should print.`,
        starter: `nums = [12, 45, 230, 99, 501]\n# find it, print it, stop early\n`,
        check: `assert "break" in _code, "Use break to stop the loop as soon as you find the number."\nassert "230" in _stdout, "The first number over 100 is 230 — print it."\nassert "501" not in _stdout, "501 should never print — break should have ended the loop at 230."`,
        hint: `for n in nums: then if n > 100: print(n) and break, both indented under the if.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 12
  {
    id: "comprehensions",
    name: "Comprehensions",
    badge: { label: "One-Liner", color: "green" },
    intro: [
      `<p>This is the feature people show when they say Python is beautiful. A <strong>list comprehension</strong> builds a full list in one readable line — a loop folded inside brackets.</p>`,
      `<pre class="code-example">doubles = [n * 2 for n in range(4)]
<span class="out"># [0, 2, 4, 6]</span>

evens = [n for n in range(10) if n % 2 == 0]
<span class="out"># [0, 2, 4, 6, 8]</span></pre>`,
      `<p>Read it out loud: "n times two, <em>for each</em> n in range(4)". Add an <code>if</code> at the end to keep only some items. Use curly braces instead, with a colon, and you build <strong>dictionaries</strong> the same way.</p>`,
    ],
    exercises: [
      {
        id: "comp-1",
        title: "Squares, one line",
        brief: `Build <code>squares</code> — the squares of 1 to 5 — in one list comprehension. No <code>.append()</code> allowed.`,
        starter: `# build squares in a single line\n`,
        check: `assert "squares" in dir(), "Create a list called squares."\nassert squares == [1, 4, 9, 16, 25], "squares should be [1, 4, 9, 16, 25]. Tip: range(1, 6) and n * n."\nassert ".append" not in _code, "The whole point: build it in one comprehension, no append."\nassert " for " in _code, "Use a comprehension — the for goes inside the brackets."`,
        hint: `squares = [n * n for n in range(1, 6)] — expression first, then the for clause.`,
      },
      {
        id: "comp-2",
        title: "The filter",
        brief: `Build <code>evens</code> — every even number from 0 to 19 — with a comprehension that uses an <code>if</code> filter at the end.`,
        starter: `# comprehension with a condition\n`,
        check: `assert "evens" in dir(), "Create a list called evens."\nassert evens == [0, 2, 4, 6, 8, 10, 12, 14, 16, 18], "evens should hold every even number below 20."\nassert " if " in _code, "Put an if filter at the end of the comprehension."`,
        hint: `evens = [n for n in range(20) if n % 2 == 0] — the if clause keeps only what passes.`,
      },
      {
        id: "comp-3",
        title: "Words, measured",
        brief: `Now a <strong>dict comprehension</strong>: build <code>lengths</code> where each word points to its length — <code>"chai"</code> to 4, <code>"samosa"</code> to 6.`,
        starter: `words = ["chai", "samosa"]\n# one dict comprehension\n`,
        check: `assert "lengths" in dir() and isinstance(lengths, dict), "Create a dictionary called lengths using braces."\nassert lengths == {"chai": 4, "samosa": 6}, "Each word should map to its len(). Expected chai: 4 and samosa: 6."\nassert " for " in _code, "Build it with a comprehension, not by hand."`,
        hint: `lengths = {w: len(w) for w in words} — key colon value, then the for clause.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 13
  {
    id: "errors",
    name: "Error Handling",
    badge: { label: "Safety Net", color: "red" },
    intro: [
      `<p>Good code does not hope that nothing goes wrong. It <strong>plans</strong> for it. <code>try</code> runs the risky part. <code>except</code> catches the crash and responds calmly instead of stopping the program.</p>`,
      `<pre class="code-example">try:
    result = 10 / 0
except ZeroDivisionError:
    print("cannot divide by zero")
<span class="out">cannot divide by zero</span></pre>`,
      `<p>Catch errors by their exact name — <code>ZeroDivisionError</code>, <code>ValueError</code> — so other bugs can still show up. And when your own code finds a wrong situation, <code>raise</code> an error yourself. That is good practice, not failure.</p>`,
    ],
    exercises: [
      {
        id: "err-1",
        title: "Defuse the division",
        brief: `Try to print <code>10 / 0</code> inside a <code>try</code> block. When the <code>ZeroDivisionError</code> happens, print <code>cannot divide by zero</code> instead of crashing.`,
        starter: `# catch the crash gracefully\n`,
        check: `assert "try" in _code and "except" in _code, "Wrap the division in try / except."\nassert "cannot divide by zero" in _stdout.lower(), "Catch ZeroDivisionError and print: cannot divide by zero"`,
        hint: `try: then print(10 / 0) indented; except ZeroDivisionError: then the message. Colons on both.`,
      },
      {
        id: "err-2",
        title: "Not a number",
        brief: `<code>int("abc")</code> crashes with a <code>ValueError</code>. Try it inside a try block, and print <code>not a number</code> when it fails.`,
        starter: `text = "abc"\n# convert safely\n`,
        check: `assert "ValueError" in _code, "Catch the specific error: except ValueError."\nassert "not a number" in _stdout.lower(), "The except branch should print: not a number"`,
        hint: `try: number = int(text) — then except ValueError: print("not a number").`,
      },
      {
        id: "err-3",
        title: "The strict teller",
        brief: `Write <code>withdraw(balance, amount)</code> that returns the new balance. But if the amount is more than the balance, <code>raise ValueError("insufficient funds")</code>. Print <code>withdraw(100, 30)</code> to test.`,
        starter: `# def withdraw(balance, amount): ...\n`,
        check: `assert "withdraw" in dir() and callable(withdraw), "Define the withdraw function."\nassert "raise" in _code, "Use raise to reject overdrafts."\nassert withdraw(100, 30) == 70, "withdraw(100, 30) should return 70."\n_raised = False\ntry:\n    withdraw(100, 200)\nexcept ValueError:\n    _raised = True\nassert _raised, "withdraw(100, 200) should raise ValueError — check your condition and raise statement."`,
        hint: `Inside the function: if amount > balance: raise ValueError("insufficient funds") — then return balance - amount.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 14
  {
    id: "tuples",
    name: "Tuples, Sets & Unpacking",
    badge: { label: "Juggler", color: "blue" },
    intro: [
      `<p>Two more containers finish your toolkit. A <strong>tuple</strong> is like a list that can never change — good for fixed pairs, like coordinates. A <strong>set</strong> keeps only one copy of each value — repeats are removed automatically.</p>`,
      `<pre class="code-example">point = (3, 4)
x, y = point        <span class="out"># unpacking: x is 3, y is 4</span>

set([1, 2, 2, 3])   <span class="out"># {1, 2, 3}</span></pre>`,
      `<p>That second line is <strong>unpacking</strong> — filling many variables in one go. It gives Python's favourite one-liner: <code>a, b = b, a</code> swaps two variables in a single step.</p>`,
    ],
    exercises: [
      {
        id: "tup-1",
        title: "Unpack the coordinates",
        brief: `Unpack the tuple <code>point</code> into two variables <code>x</code> and <code>y</code> in one line. Then print both.`,
        starter: `point = (3, 4)\n# unpack point into two names\n`,
        check: `assert "x" in dir() and "y" in dir(), "Create x and y by unpacking."\nassert x == 3 and y == 4, "x should be 3 and y should be 4 — unpack them from point."\nassert "x, y" in _code.replace("  ", " ") or "x,y" in _code.replace(" ", ""), "Unpack in one line: x, y = point"`,
        hint: `x, y = point — Python matches the two names to the two values in order.`,
      },
      {
        id: "tup-2",
        title: "The deduplicator",
        brief: `The visitor list has repeats. Make <code>unique</code> — a set of the visitors — and print how many different people came.`,
        starter: `visitors = ["Ravi", "Meera", "Ravi", "Dev", "Meera"]\n# unique = ...\n`,
        check: `assert "unique" in dir() and isinstance(unique, set), "Create unique using set(...)."\nassert unique == {"Ravi", "Meera", "Dev"}, "unique should hold exactly Ravi, Meera and Dev — one of each."\nassert "set(" in _code, "Convert the list with the set() function."`,
        hint: `unique = set(visitors) then print(len(unique)). Duplicates vanish automatically.`,
      },
      {
        id: "tup-3",
        title: "The famous swap",
        brief: `Swap <code>a</code> and <code>b</code> in <strong>one line</strong> using unpacking — no third variable allowed. Print both after the swap.`,
        starter: `a = 1\nb = 2\n# swap them in one line\n`,
        check: `assert a == 2 and b == 1, "After the swap, a should be 2 and b should be 1."\nassert "b, a" in _code or "b,a" in _code.replace(" ", ""), "Use the one-line idiom: a, b = b, a"\nassert "temp" not in _code.lower(), "No temporary variable — that is the whole trick."`,
        hint: `a, b = b, a — the right side is bundled into a tuple before either name changes.`,
      },
    ],
  },

  // ======================================================= EXPERT TRACK ===

  // --------------------------------------------------------------- Stage 15
  {
    id: "classes",
    name: "Classes & Objects",
    badge: { label: "Architect", color: "yellow" },
    intro: [
      `<p>Welcome to the Expert track. Until now, your data (dictionaries) and your actions (functions) lived apart. A <strong>class</strong> joins them into one blueprint. From that blueprint you create <strong>objects</strong>.</p>`,
      `<pre class="code-example">class Dog:
    def __init__(self, name):
        self.name = name

    def bark(self):
        return f"{self.name} says woof"

rex = Dog("Rex")
print(rex.bark())
<span class="out">Rex says woof</span></pre>`,
      `<p><code>__init__</code> runs when an object is created, and saves its data on <code>self</code>. Every method takes <code>self</code> first — that is how the object talks about itself. Most big Python projects — websites, games, banks — are built this way.</p>`,
    ],
    exercises: [
      {
        id: "cls-1",
        title: "Build the blueprint",
        brief: `Write the <code>Dog</code> class from the lesson yourself: an <code>__init__</code> that stores <code>name</code>, and a <code>bark()</code> method that returns <code>&lt;name&gt; says woof</code>. Make one dog and print its bark.`,
        starter: `# class Dog: ...\n`,
        check: `assert "Dog" in dir(), "Define a class called Dog (capital D)."\nassert "__init__" in _code, "Give Dog an __init__ method that stores the name on self."\n_d = Dog("Rex")\nassert _d.bark() == "Rex says woof", "Dog(\\"Rex\\").bark() should return: Rex says woof"\n_d2 = Dog("Moti")\nassert _d2.bark() == "Moti says woof", "Every dog should bark its own name — use self.name in bark()."`,
        hint: `def __init__(self, name): self.name = name — then def bark(self): return f"{self.name} says woof".`,
      },
      {
        id: "cls-2",
        title: "The click counter",
        brief: `Build a <code>Counter</code> class. It starts with <code>count</code> at 0, and its <code>increment()</code> method adds 1. Make one, call increment three times, and print the count.`,
        starter: `# class Counter: ...\n`,
        check: `assert "Counter" in dir(), "Define a class called Counter."\n_c = Counter()\nassert _c.count == 0, "A fresh Counter should start with count 0 — set it in __init__."\n_c.increment()\n_c.increment()\nassert _c.count == 2, "increment() should add exactly 1 to self.count each call."\nassert "3" in _stdout, "Increment your own counter three times and print its count — should show 3."`,
        hint: `__init__ sets self.count = 0; increment does self.count = self.count + 1. Note __init__ here takes only self.`,
      },
      {
        id: "cls-3",
        title: "Judge a book by its string",
        brief: `The special method <code>__str__</code> decides what <code>print()</code> shows for your object. Build <code>Book(title, author)</code> so that printing a book shows <code>&lt;title&gt; by &lt;author&gt;</code>.`,
        starter: `# class Book: ...\n\n# then:\n# print(Book("Dune", "Herbert"))\n`,
        check: `assert "Book" in dir(), "Define a class called Book."\nassert "__str__" in _code, "Define the __str__ method — that is what print() calls."\nassert str(Book("Dune", "Herbert")) == "Dune by Herbert", "str(Book(\\"Dune\\", \\"Herbert\\")) should be: Dune by Herbert"`,
        hint: `def __str__(self): return f"{self.title} by {self.author}" — print() uses it automatically.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 16
  {
    id: "inheritance",
    name: "Inheritance",
    badge: { label: "Bloodline", color: "green" },
    intro: [
      `<p>Classes can have children. A child class <strong>inherits</strong> everything from its parent, and can replace or add what it needs. Write the shared code once; write the special code only where needed.</p>`,
      `<pre class="code-example">class Animal:
    def speak(self):
        return "..."

class Cat(Animal):
    def speak(self):
        return "meow"</pre>`,
      `<p>The brackets in <code>class Cat(Animal)</code> name the parent. If the child has its own <code>__init__</code>, call <code>super().__init__(...)</code> first, so the parent's setup still runs. Bonus: you can loop over different animals and call <code>speak()</code> on each one — this is called <strong>polymorphism</strong>.</p>`,
    ],
    exercises: [
      {
        id: "inh-1",
        title: "The rebellious child",
        brief: `The <code>Animal</code> parent is ready. Make <code>Cat</code> inherit from it, but replace <code>speak()</code> so it returns <code>meow</code>. Print a cat's speak.`,
        starter: `class Animal:
    def speak(self):
        return "..."

# your subclass here
`,
        check: `assert "Cat" in dir(), "Define the Cat class."\nassert "class Cat(Animal)" in _code.replace(" :", ":"), "Inherit by declaring: class Cat(Animal):"\n_c = Cat()\nassert isinstance(_c, Animal), "Cat should inherit from Animal."\nassert _c.speak() == "meow", "Cat().speak() should return meow — override the method."`,
        hint: `class Cat(Animal): then a speak method returning "meow". Same method name replaces the parent's.`,
      },
      {
        id: "inh-2",
        title: "Respect your elders",
        brief: `<code>Employee</code> stores a <code>name</code>. Make <code>Manager(Employee)</code> whose <code>__init__</code> takes <code>name</code> and <code>team</code>, calls <code>super().__init__(name)</code>, and saves the team. Make one and print both values.`,
        starter: `class Employee:
    def __init__(self, name):
        self.name = name

# class Manager(Employee): ...
`,
        check: `assert "Manager" in dir(), "Define the Manager class."\nassert "super()" in _code, "Call super().__init__(name) so Employee still stores the name."\n_m = Manager("Asha", "Data")\nassert _m.name == "Asha", "The name should be stored by the parent via super().__init__."\nassert _m.team == "Data", "Store the team on self in Manager's __init__."`,
        hint: `def __init__(self, name, team): super().__init__(name) then self.team = team.`,
      },
      {
        id: "inh-3",
        title: "One loop, many voices",
        brief: `Both classes are ready. Put one <code>Dog</code> and one <code>Cat</code> in a list. Loop over it and print each animal's <code>speak()</code> — one loop, two different types.`,
        starter: `class Dog:
    def speak(self):
        return "woof"

class Cat:
    def speak(self):
        return "meow"

# animals = [...] then loop and print each speak()
`,
        check: `assert "for" in _code, "Use one loop over a list holding both animals."\nassert "woof" in _stdout and "meow" in _stdout, "Both voices should print — call speak() on each animal inside the loop."`,
        hint: `animals = [Dog(), Cat()] then for a in animals: print(a.speak()). The loop never asks which type it holds.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 17
  {
    id: "functional",
    name: "Functional Python",
    badge: { label: "Alchemist", color: "red" },
    intro: [
      `<p>In Python, functions are values too. You can store them, pass them to other functions, and build small ones on the spot. A <strong>lambda</strong> is a one-line function with no name.</p>`,
      `<pre class="code-example">double = lambda n: n * 2

items = [("jalebi", 40), ("chai", 15)]
sorted(items, key=lambda item: item[1])
<span class="out"># [(chai, 15), (jalebi, 40)] — sorted by price</span></pre>`,
      `<p>The <code>key=</code> argument is where lambdas shine: "sort these items, judged by <em>this</em>". And <code>*args</code> lets a function accept any number of arguments — they arrive packed in a tuple.</p>`,
    ],
    exercises: [
      {
        id: "fun-1",
        title: "The nameless function",
        brief: `Make <code>double</code> — a lambda that returns its input times two. Print <code>double(5)</code>.`,
        starter: `# one tiny nameless function\n`,
        check: `assert "double" in dir() and callable(double), "Create double as a function."\nassert "lambda" in _code, "This one must be a lambda — no def."\nassert double(5) == 10 and double(7) == 14, "double(n) should return n * 2 for any n."`,
        hint: `double = lambda n: n * 2 — parameter, colon, single expression. No return keyword needed.`,
      },
      {
        id: "fun-2",
        title: "Sort by price",
        brief: `Sort the menu items from cheapest to most costly into <code>cheapest_first</code>. Use <code>sorted()</code> with a <code>key=</code> lambda that picks the price. Print the result.`,
        starter: `items = [("jalebi", 40), ("chai", 15), ("samosa", 20)]\n# cheapest_first = sorted(...)\n`,
        check: `assert "cheapest_first" in dir(), "Create the sorted list cheapest_first."\nassert "key=" in _code.replace(" ", ""), "Tell sorted how to judge each item with the key= argument."\nassert cheapest_first == [("chai", 15), ("samosa", 20), ("jalebi", 40)], "Expected chai, samosa, jalebi order — the key lambda should return item[1], the price."`,
        hint: `cheapest_first = sorted(items, key=lambda item: item[1]) — the lambda extracts what to sort by.`,
      },
      {
        id: "fun-3",
        title: "Take everything",
        brief: `Write <code>total(*args)</code> that accepts <strong>any number</strong> of numbers and returns their sum. Print <code>total(1, 2, 3)</code>.`,
        starter: `# def total(*args): ...\n`,
        check: `assert "total" in dir() and callable(total), "Define the total function."\nassert "*" in _code, "Use *args in the parameter list to accept any number of arguments."\nassert total(1, 2, 3) == 6, "total(1, 2, 3) should return 6."\nassert total(10) == 10 and total() == 0, "It should handle one argument — and none. sum() copes with both."`,
        hint: `def total(*args): return sum(args) — args arrives as a tuple, and sum() of an empty tuple is 0.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 18
  {
    id: "generators",
    name: "Generators",
    badge: { label: "Streamkeeper", color: "blue" },
    intro: [
      `<p>A normal function does all its work, then returns once. A <strong>generator</strong> uses <code>yield</code> to hand out values one at a time, pausing in between. It can produce millions of values while using almost no memory.</p>`,
      `<pre class="code-example">def countdown(n):
    while n > 0:
        yield n
        n = n - 1

list(countdown(3))
<span class="out"># [3, 2, 1]</span></pre>`,
      `<p>Each <code>next()</code> continues the function from where it paused. A generator can even be <em>endless</em> — the caller simply stops asking. Also: swap a comprehension's square brackets for round ones and you get a <strong>generator expression</strong>.</p>`,
    ],
    exercises: [
      {
        id: "gen-1",
        title: "Yield the countdown",
        brief: `Write the <code>countdown(n)</code> generator from the lesson. It yields <code>n</code>, then <code>n-1</code>, down to 1. Print <code>list(countdown(3))</code>.`,
        starter: `# def countdown(n): ...\n`,
        check: `assert "countdown" in dir() and callable(countdown), "Define the countdown generator."\nassert "yield" in _code, "A generator must use yield, not return."\nassert list(countdown(3)) == [3, 2, 1], "list(countdown(3)) should be [3, 2, 1]."\nassert list(countdown(5)) == [5, 4, 3, 2, 1], "It should work for any n."`,
        hint: `while n > 0: yield n, then n = n - 1. The function pauses at every yield.`,
      },
      {
        id: "gen-2",
        title: "Lazy squares",
        brief: `Make <code>squares_gen</code> — a <strong>generator expression</strong> (round brackets, not square) of the squares of 0 to 3. Do <strong>not</strong> print or use it — the checker will read it and needs all four values still inside.`,
        starter: `# squares_gen = ( ... for ... )\n`,
        check: `import types\nassert "squares_gen" in dir(), "Create squares_gen."\nassert isinstance(squares_gen, types.GeneratorType), "Use parentheses, not brackets — that makes it a generator, not a list."\nassert list(squares_gen) == [0, 1, 4, 9], "Draining the generator should give [0, 1, 4, 9] — and it should be unconsumed, so no printing it first."`,
        hint: `squares_gen = (n * n for n in range(4)) — one line, and resist the urge to print it.`,
      },
      {
        id: "gen-3",
        title: "The infinite spring",
        brief: `Write <code>fib()</code> — an <strong>endless</strong> Fibonacci generator that yields 0, 1, 1, 2, 3, 5, … forever, using <code>while True</code>. The checker will take only the first six values.`,
        starter: `# def fib(): ...\n#   a, b = 0, 1 is a good start\n`,
        check: `assert "fib" in dir() and callable(fib), "Define the fib generator."\nassert "yield" in _code and "while" in _code, "Use while True with yield — infinite is fine, callers take what they need."\n_f = fib()\n_vals = [next(_f) for _ in range(6)]\nassert _vals == [0, 1, 1, 2, 3, 5], "The first six values should be 0, 1, 1, 2, 3, 5. Start with a, b = 0, 1; yield a; then a, b = b, a + b."`,
        hint: `a, b = 0, 1 then while True: yield a and a, b = b, a + b — your stage-14 swap skill, now powering infinity.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 19
  {
    id: "decorators",
    name: "Decorators & Closures",
    badge: { label: "Enchanter", color: "yellow" },
    intro: [
      `<p>The last skill. A <strong>closure</strong> is a function made inside another function — it remembers the variables around it. A <strong>decorator</strong> uses this trick to wrap any function with extra behaviour. That is the <code>@</code> symbol you see in Flask and FastAPI.</p>`,
      `<pre class="code-example">def shout(func):
    def wrapper():
        return func().upper()
    return wrapper

@shout
def greet():
    return "hello"

print(greet())
<span class="out">HELLO</span></pre>`,
      `<p><code>@shout</code> is just a short form of <code>greet = shout(greet)</code> — the original function goes in, a wrapped one comes out. Give the wrapper <code>*args</code> and it can wrap any function.</p>`,
    ],
    exercises: [
      {
        id: "dec-1",
        title: "The function factory",
        brief: `Write <code>make_multiplier(k)</code> that returns a <strong>new function</strong> which multiplies its input by <code>k</code>. Then make <code>triple = make_multiplier(3)</code> and print <code>triple(4)</code>.`,
        starter: `# def make_multiplier(k):\n#     def inner(n): ...\n`,
        check: `assert "make_multiplier" in dir() and callable(make_multiplier), "Define make_multiplier."\n_t = make_multiplier(3)\nassert callable(_t), "make_multiplier should return a function — return inner, without calling it."\nassert _t(4) == 12, "make_multiplier(3)(4) should be 12 — inner remembers k."\nassert make_multiplier(5)(2) == 10, "Each factory call should capture its own k."`,
        hint: `Define inner(n) inside, returning n * k, then return inner (no parentheses — you return the function itself).`,
      },
      {
        id: "dec-2",
        title: "Your first decorator",
        brief: `Write the <code>shout</code> decorator from the lesson. Then write <code>greet()</code> that returns <code>"hello"</code>, with <code>@shout</code> above it. Print <code>greet()</code> — it should come out as <code>HELLO</code>.`,
        starter: `# the decorator first, then the decorated greet\n`,
        check: `assert "shout" in dir() and callable(shout), "Define the shout decorator."\nassert "@shout" in _code, "Apply it with the @shout line directly above def greet."\nassert "greet" in dir() and greet() == "HELLO", "greet() should return HELLO — the wrapper upper-cases the original result."`,
        hint: `shout takes func, defines wrapper() returning func().upper(), returns wrapper. Then @shout on its own line above def greet.`,
      },
      {
        id: "dec-3",
        title: "Wrap anything",
        brief: `Write a <code>log</code> decorator. Its wrapper takes <code>*args</code>, prints <code>calling</code>, then returns <code>func(*args)</code>. Put it on <code>add(a, b)</code> and print <code>add(2, 3)</code>.`,
        starter: `# def log(func):\n#     def wrapper(*args): ...\n`,
        check: `assert "log" in dir() and callable(log), "Define the log decorator."\nassert "*args" in _code, "The wrapper needs *args so it can decorate any function."\nassert "@log" in _code, "Apply it to add with @log."\nassert "add" in dir() and add(2, 3) == 5, "add(2, 3) should still return 5 — the wrapper must return func(*args)."\nassert "calling" in _stdout, "Your printed test call should have logged the word: calling"`,
        hint: `wrapper(*args) prints "calling", then return func(*args). The *args flows straight through to the real function.`,
      },
    ],
  },

  // --------------------------------------------------------------- Stage 20
  {
    id: "master",
    name: "Master Capstone: The Bank",
    badge: { label: "Python Master", color: "red" },
    intro: [
      `<p>The final door. You will build a small but real system: a bank account with a balance, safe operations, and a record of every transaction — classes, error handling and methods working together.</p>`,
      `<pre class="code-example">acct = BankAccount("Gaurav")
acct.deposit(500)
acct.withdraw(200)
<span class="out"># balance: 300, history: [("deposit", 500), ("withdraw", 200)]</span>
acct.withdraw(5000)
<span class="out"># ValueError: insufficient funds</span></pre>`,
      `<p>Every rule you learned is here for a reason, exactly like in real banking code. Take your time. When the checker turns green, you are no longer a beginner — by any honest measure.</p>`,
    ],
    exercises: [
      {
        id: "master-1",
        title: "The Bank of Python",
        brief: `Complete <code>BankAccount</code>. <code>deposit(amount)</code> adds to the balance and records <code>("deposit", amount)</code> in <code>history</code>. <code>withdraw(amount)</code> raises <code>ValueError("insufficient funds")</code> if there is not enough money; otherwise it subtracts and records <code>("withdraw", amount)</code>. The test code at the bottom should print 300.`,
        starter: `class BankAccount:
    def __init__(self, owner):
        self.owner = owner
        self.balance = 0
        self.history = []

    def deposit(self, amount):
        # add to balance, record ("deposit", amount)
        pass

    def withdraw(self, amount):
        # raise ValueError("insufficient funds") on overdraft
        # otherwise subtract and record ("withdraw", amount)
        pass

acct = BankAccount("Gaurav")
acct.deposit(500)
acct.withdraw(200)
print(acct.balance)
`,
        check: `assert "BankAccount" in dir(), "Keep the BankAccount class."\n_a = BankAccount("Test")\n_a.deposit(100)\nassert _a.balance == 100, "deposit(100) on a fresh account should make the balance 100."\n_a.withdraw(40)\nassert _a.balance == 60, "withdraw(40) should bring 100 down to 60."\nassert ("deposit", 100) in _a.history, "deposit should record the tuple (\\"deposit\\", amount) in self.history."\nassert ("withdraw", 40) in _a.history, "withdraw should record the tuple (\\"withdraw\\", amount) in self.history."\nassert "raise" in _code, "Overdrafts must be rejected with raise."\n_raised = False\ntry:\n    _a.withdraw(9999)\nexcept ValueError:\n    _raised = True\nassert _raised, "Withdrawing more than the balance should raise ValueError."\nassert _a.balance == 60, "A rejected withdrawal must not change the balance."\nassert "300" in _stdout, "The test drive should print 300 — deposit 500 minus withdraw 200."`,
        hint: `deposit: self.balance = self.balance + amount, then self.history.append(("deposit", amount)). withdraw checks the overdraft first, raises, and otherwise mirrors deposit.`,
      },
    ],
  },
];
