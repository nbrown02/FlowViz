**FAQs**

**How is lead time/cycle time calculated?**

Lead time measures the total time elapsed from the creation of work items to
their completion.

Cycle time measures the time it takes for your team to complete work items once
they begin actively working on them.

The following diagram illustrates how Lead Time differs from Cycle Time in the
context of Azure DevOps.

![https://docs.microsoft.com/en-us/azure/devops/report/dashboards/_img/cycle-lead-time-concept-intro.png?view=azure-devops](media/7dbf0978a294c0db379de8badee1bf24.png)

Lead time is calculated from work item creation to entering a completed state.

Cycle time is calculated from a work item first entering an In Progress state to
entering a Completed state.

**Why does my scatter chart have white spaces?**

Unfortunately, Power BI does not like date on the x-axis with a scatter plot -
using the CompletedDate column will present an error message. The workaround for
this, which the scatter plot currently uses, is to use the CompletedDateSK
field. This is treated as a whole number, so for an item completed on 4th
December 2019, it would be 20191204 or 20,191,204. Due to this being treated as
a ‘number’ it creates these white spaces which you will likely see in your
charts.

**How can I filter by each sprint/iteration?**

Filtering by sprint/iteration is not included by default (Agile ≠ Scrum) within
the dashboard, however the Iterations table is included in the dataset. If you
want to add a slicer by Iteration path, simply copy the steps below:

(Add GIF)

Then you can add a sprint/iteration filter to your charts.

**Why don’t you have velocity in this dashboard?**

Velocity (sum of effort/story points) is a metric that is easily abused/gamed
and, through my years as a practitioner, I’ve found it to be pretty useless as a
metric. It forces teams to focus too much on ‘getting our points up’ or just
artificially inflating estimates and thus ‘increase velocity’. Countless studies
(including my own) have proven that there is little/no correlation in points
estimation, and that it is no better than using count of items (otherwise known
as Throughput). Plus, Senior Managers and Executives don’t want to hear about
story points, they want a language that makes sense, not some obscure voodoo :)

This dashboard is all centred on flow and transparency, in a language that is
simpler to digest, hence why velocity is excluded.

**Can I add technical metrics?**

Technical metrics are available in v3.0 of the Odata API. However, in their
current format I’ve found them to be limited in the value they can bring. You
can bring them in as additional tables if you wish, like so:

If you’re looking for things such as the DORA software delivery performance
metrics (Lead time for changes, Deployment frequency, Time to restore service,
Change failure rate) these are unfortunately not \* currently \* available.

**How I do I change the forecasting inputs/outputs?**

Changing the forecasting visuals is relatively simple to do. Reasons for this
could be if you don’t have ‘enough’ data yet but have a reasonable amount. For
example, the ‘when will it be done’ chart uses 10 weeks’ worth of historical
data, if you have six weeks’ worth of data you may want to edit to just use
those six weeks rather than including an extra four weeks of zero throughput.
You may also want to project further out than the default 30 days for the ‘what
will we get’ visual.

*To edit ‘When will it be done?’*

Click on the ellipsis

![](media/cf68d5d6df81afa641c8abc276c59bab.png)

, then edit

![](media/8d3a163124dcd1387a96a814de990b08.png)

Scroll down to line 173 in the code, edit the number 70 (10 weeks x 7 days = 70)
to the number of days you’d like to use (so if you wanted to use 7 weeks’ worth
of data change it to 49). Then hit save.

![](media/22120942fee251b1217843d9006de141.png)

Go back to report and view your updated visual.

*To edit ‘What will we get?’*

Click on the ellipsis

![](media/cf68d5d6df81afa641c8abc276c59bab.png)

, then edit

![](media/9e335259b7a9719402bba131aeb9a923.png)

Scroll down to line 151 in the code, edit the number 30 (30 days projection) to
the number of days you’d like to forecast into the future to (so if you wanted
to forecast number of items for the next 6 weeks’ change it to 42). Then hit
save.

![](media/54c26c37824ab7fee014637044fb50e6.png)

Go back to report and view your updated visual.

**Chart Overview: Quality – How Well**

**What is this chart?** Quality is measured as the percentage of completed work
that is marked as bug work item type. The number of bugs completed each week is
divided by the total count of completed items that same week.

**What is the intended behaviour?** Help teams continuously triage and complete
bug work items at a consistent rate. Try and drive to keep the percentage level
(and low!) without deferring bugs.

**How is it gamed?** Bugs are entered as PBIs/User Stories (seen by growing
throughput, but lowering customer satisfaction and complaints)

**When overdriven, what can it lead to?** Responsiveness metric may increase for
bug work item types. The number of open defects may grow (and thus work item age
for these items will increase) if PBI/User Story work is done in preference.

![](media/ad87b1a79bf2d835c137a9886f9af386.png)

![](media/5090a717f135d83fd728d3d011c9efbf.png)

**Chart Overview: Productivity – How Much**

**What is this chart?** Productivity is measured as the number of completed
PBIs/User Stories and Bugs per week, commonly referred to as Throughput. The
chart counts how many items were finished each calendar week, helping see the
trend over time.

**What is the intended behaviour?** Help teams find what level of throughput per
week is consistently achievable and to find ways to increase this over time by
improving their processes.

**How is it gamed?** Throughput can be increased by breaking down items into
smaller pieces (may not be a bad thing – so long as they are vertically
slicing!). Teams could also prematurely sign-off work only to have bugs reported
later (seen by increase in defect percentage in quality chart).

**When overdriven, what can it lead to?** Quality metric goes up as more bugs
are reported. Predictability moved down into more orange bars.

![](media/3ac37c56de22900a401b3784861300cc.png)

![](media/6ebb16de8b52b2c0c01d659e07efdcee.png)

**Chart Overview: Responsiveness – How Fast**

**What is this chart?** Responsiveness is measured as the average median cycle
time for all items completed in the same week. Cycle time is calculated from a
work item first entering an In Progress state to entering a Completed state.

**What is the intended behaviour?** Help teams understand the cycle time for
completing items, and to look for ways to reduce the time (and variability) by
eliminating unnecessary steps and waste.

**How is it gamed?** Only fast simple work is started (seen by initial
increasing productivity only to regress later). Premature sign-off of items as
finished (seen by growing bug counts)

**When overdriven, what can it lead to?** Quality metric goes up as more defects
are reported due to premature completion. Predictability chart has higher peaks
as more work completes but then work starts on more bugs that are opened.

![](media/abd1114074eac836d79d4b6b8fafcb98.png)

![](media/f2c8ebcafd262b02e2f2e8ce050dbc08.png)

**Chart Overview: Predictability – How Repeatable**

**What is this chart?** Predictability is measured as net flow per week. The
dashboard counts how many items were finished and subtracts how many items were
started for the same calendar week creating a positive bar (blue) if more is
finished than started, or a negative bar (orange) if more items were started
than finished.

**What is the intended behaviour?** Stop starting, start finishing. Help teams
focus on finishing something in-progress (or helping someone on the team finish
something) before starting something new. Aim for getting close to zero
consistently (meaning we finish as many things as we start).

**How is it gamed?** Teams can prematurely sign-off work only to have bugs
reported later (seen by increase in quality chart). Teams can slow down starting
new work (seen by a decrease in productivity chart).

**When overdriven, what can it lead to?** Quality metric goes up as more defects
are reported due to premature completion.

![](media/4f4a507203c32142f44fc39907a52963.png)

![](media/d89efb42ff3905d5a2d044a1f8b19dff.png)

**Chart Overview: When will it be done?**

**What is this chart?** Based on the number of items to forecast (drop down),
what is the percentage likelihood of completion in number of days. The chart
runs 10,000 simulations of different scenarios using the historical throughput
data of the last 10 weeks. The output is distribution of these simulations, with
50th/85th/95th percentiles of likelihood. The current backlog size number is
based on the number of items (PBI/User Stories & Bugs) in the backlog that are
not in a Removed or Completed state.

**What is the intended behaviour?** Software development is complex. Traditional
estimation from teams produces a single result and do not produce a likelihood
of meeting that result. More often than not the result presented is only 50%
likely due to dividing the remaining work by the average (or median). This means
the odds of that result are a coin-toss.

This method allows the reader/customer/client to choose the amount of risk they
wish to sign-up to, in particular if they want to deliver ‘everything’.

**How is it misused?** Only using it at the beginning of the project/product
development. It should be continually inspected as part of your progress.
Another common mistake is not throwing away ‘old data’ if context/domain/team
size changes. Use this chart to see if ‘everything’ is needed and re-prioritise
scope.

![](media/ab4ce074d1973a3d8ae6c27cbbef417d.png)

![](media/f083369bfeba35cc27cd40b4e3cb5528.png)

**Chart Overview: When will it be done?**

**What is this chart?** Based on historical throughput of the last 10 days, how
many items are we likely to deliver in the next 30 days. The chart runs 10,000
simulations of different scenarios using the historical throughput data of the
last 10 weeks. The output is distribution of these simulations, with
50th/85th/95th percentiles of likelihood for number of items.

**What is the intended behaviour?** Software development is complex. Traditional
estimation from teams produces a single result and do not produce a likelihood
of meeting that result. More often than not the result presented is only 50%
likely due to dividing the remaining work by the average (or median). This means
the odds of that result are a coin-toss.

This method allows the reader/customer/client to choose the amount of risk they
wish to sign-up to. A common middle ground used in the industry is 85%.

**How is it misused?** Only using it at the beginning of the project/product
development. It should be continually inspected as part of your progress.
Another common mistake is not throwing away ‘old data’ if context/domain/team
size changes. Use this chart to see if re-prioritisation is needed, or if we
should focus on slicing items.

![](media/cd6434fcd94c87594f5ba958e2e5f779.png)
