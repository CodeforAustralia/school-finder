# school-finder
:eyes: A tool for locating public (government) schools in New South Wales, Australia.

## Demo

See http://codeforaustralia.github.io/school-finder/

## Screen shots

### Users can search by type of school or a specific school
![Screenshot of intro screen](/doc/screenshots-1-intro.png)

### <strike>Users needing specific types of support can search for schools providing that</strike>

Note: this was removed some time ago (we've tagged the
[last code to provide it](https://github.com/CodeforAustralia/school-finder/tree/v0.2-special-support),
and you can view a demo of that [here](https://techieshark.github.io/school-finder/)),
but we're debating how to best accomodate users needing this information.
That discussion is happening on
[issue #333](https://github.com/CodeforAustralia/school-finder/issues/333).
Feedback from the school administrators is that parents needing support
should contact their local school, which should then help them find the
support they need (either at that school or at a nearby school).
However, we've heard from parents that this fact is not
obvious from the interface as is, and that they'd still
like to have a way to run that search of schools *currently* providing
a current type of support.

![Screenshot of support screen](/doc/screenshots-2-support.png)

### Users provide their location so we can find the closest matching school
![Screenshot of location screen](/doc/screenshots-3-user-location.png)

### The matching school is shown on the map, and it's details are provided.
![Screenshot of school details screen](/doc/screenshots-4-school-details.png)

### Use the map's nearby schools control to see schools nearby

In this case, 'nearby' is relative: if you live on Lord Howe Island, the nearest
schools may be on the mainland.

![Screenshot of nearby schools view](https://cloud.githubusercontent.com/assets/1072292/25609115/9d98330c-2ed2-11e7-83b9-e0d5ac7fa000.png)

### The map's nearby schools control is a powerful means of filtering which schools show on the map

As you can see, the schools control has many options to filter down to
just the school types you are interested in.

<img width=300px src="/doc/screenshots-map-control-toggle-1.png" alt="Screenshot of school control, toggled off"/>
<img width=300px src="/doc/screenshots-map-control-toggle-2.png" alt="Screenshot of school control, toggled on"/>
<img width=300px src="/doc/screenshots-map-control-toggle-3.png" alt="Screenshot of school control, switching between school types"/>
<img width=300px src="/doc/screenshots-map-control-toggle-4.png" alt="Screenshot of school control,switching which features of secondary schools to filter by"/>


## The Premise

There are currently multiple government provided, online search tools for finding schools. The school finder project sets about taking the best of each existing service, and combining them with a focus on heightened user experience. The school finder looks fresh and inviting, it has a smooth work flow and the results section provides vital information in two sections- an overview area, which is boxed out in grey; and a longer, narrative style school description which has been provided by the schools themselves and is intended to give users insight in the schools overall vibe and style.

## Goals

The school finder is intended to provide NSW public school information to parents, students, future students and other stakeholders

## Development

The school finder collects information from the user, and provides school information based on this collection. There are three main sections- school level (primary or secondary), support (optional), and user location. Results show user which school’s catchment area they fall into, as well as information about that school.
Version one provides information in two sections- an overview and a description provided by the school itself.
Version two is intended to increase useability, through the changed presentation of school information. Results would be divided into multiple sections, which are faster and easier for the user to process. Version two is reliant on data being collected from schools in a different format.

## Contributing

Please read the [contributing guide](CONTRIBUTING.md).


[new-issue]: https://github.com/CodeforAustralia/school-finder/issues/new "Create a new issue"
[issues]: https://github.com/CodeforAustralia/school-finder/issues "View list of issues"


