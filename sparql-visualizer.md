I am a semantic web engineer. I need to write SPARQL queries routinely and I often check the SPARQL queries that my coworkers make, too. A way to visualize the pattern before trying to run the query (or being able to visualize the intended pattern without having the data available to the query endpoint) would be useful to me.

So, I'd like to get the ability to visualize a SPARQL query in a webpage. The core function would be to take some block of SPARQL query code (as an input) and then interpret the code as having nodes and edges, and then displaying the nodes and edges in a way that is easy on the eyes.

I have in mind making a static webpage (deployed in GitHub) that has HTML, CSS, and JavaScript.

First consideration for this core feature, I think the "WHERE" clause is the majority of what needs to be drawn in the diagram (at least initially), especially since whatver is in the SELECT, CONSTRUCT, ASK, DELETE portion rides on what was found in the WHERE clause. I think in cases where the query is SELECT, it would be very cool to somehow overlay or highlight (a yellow shadow or glow?) those nodes and literals that are being returned. Similarly, INSERT or CONSTRUCT might have highlighted (a green shadow or glow?) those new nodes and edges that are being appended to the existing diagram, whereas DELETE might be highlighted with a red shadow or glow. Let's consider how we'd draw each aspect.

Second consideration for this core feature, is that I don't think I want to manage the existing diagram (which is part of the DOM) to be managed and updated whenever the query textbox is updated. I think the DOM should reflect (downstream) whatever changes are occurring in the query box and the user's choices/settings. Therefore, it may be worth considering whether we should make each query as interpreted into some distillation (abstracted from SPARQL?) that is easily consumable for node-edge graph data rendering.

Third consideration is that there are a variety of conventions that might make it easy for the semantic engineer to interpret the visual presentation. First, since IRIs can be long and CURIEs are often used in queries, I would like to display the CURIE whenever it is available. But when a CURIE isn't available, I would want there to be some break-right/word wrap to help keep the graph easy to understand. There are conventions about color, too: named individuals are purple diamond (or oval) nodes, classes are yellow oval nodes, object properties are blue edges, datatype properties are green edges (to green box nodes with literals within them), annotation properties are orange edges (to orange box nodes with literals within them).

Fourth consideration is that I may want to use this in another app. I want the diagram not to take up the whole screen. It should not take more than 50% of the width or not more than 60% height of the screen.

Fifth consideration is that there are a wide variety of SPARQL functions (FILTER, ASCENDING, GROUPING, HAVING, etc.) might be hard to visualize. Maybe you have some suggestions. Prefixes for curies might want to be displayed as a legend at the bottom of the visual.

I know there are things like Mermaid and D3 that help with visualizations. I'm willing to use either. I realize some of the things I am describing won't be easy to do in Mermaid. We can discuss trade-offs.

I have a variety of constraints I want to follow:

HTML is semantically tagged (head, body, main, section, footer).

CSS uses normalize.css and skeleton.css as a baseline. All CSS is properly scoped, so that things are not asserted at the element level (e.g., table, tr, button, etc.) but rather relative to the sparql visualizer app.

For the JavaScript, I am trying to develop following a variety of constraints:

First constraint, I want JSDoc comments at the beginning of every function.

Second constraint, I want the function to be written in ES6 style. Exception: I have a variety of minified JS libraries that I will be bringing in by saving locally rather than calling the web or importing as modules. If you are bringing in external libraries, that's how I'll handle those too.

Third constraint, I want the functions to be pure functions, with minimal nesting (nested functions can be pulled apart for modularity and get a unique name). Likewise, I don’t want DOM handlers to define functions, but rather to pass variables to named functions. I want them kept separate. Any DOM event handler should call named functions, not unnamed ones.

Fourth constraint, I want every function to have event logging and error handling. I want the option to turn off all console logs with a constant “debuggerConsoleLogEnabled” = false, or set to true when I want it turned on. I want outcomes of some functions (the primary ones) to have toast notifications for the user. This is especially helpful to make it clear when the diagram is being updated.

Fifth constraint, I want every function to have a unit test in Jest, with some common inputs and expected outputs, ready-made. I will be running these tests from a CI pipeline.

Sixth constraint, I want to be DRY (don’t repeat yourself), reusing functions as far as possible. I don’t mind changing my previously made functions, in order to make them more reusable. I have attached some JS. What aren’t attached are some common libraries (rdflib.js, comunica-browser.js, n3.js).

Seventh constraint, I want the functions to be named for what it does, and with the intent to be reused in very different scenarios. For example, don’t name a function ‘downloadRDF’ because that is likely to either collide with another, similar function – and it doesn’t seem well planned, for the simple reason that it means one would have a different download function for each file type (which isn’t a great idea).