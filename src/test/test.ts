import * as table from "../lib";

interface Person {
    name: string;
    age: number;
    title: string;
}

const t = new table.Table<Person>({
    columns: [
        { header: "name", expression: x => x.name, border: "double" },
        { header: "age", expression: x => x.age }
    ],
    group: [
        { by: x => x.age },
        { by: x => x.title }
    ],
    groupStyles: [
        { depth: 0, backgroundColor: "cyan", foregroundColor: "black" },
        { depth: 1, backgroundColor: "green", foregroundColor: "white" }
    ]
});

t.render([
    { name: "John", age: 25, title: "Design" },
    { name: "Mary", age: 25, title: "Development" },
    { name: "Anne", age: 27, title: "Test" },
    { name: "Bob", age: 26, title: "Test" }
], process.stdout);

new table.Table<boolean>({}).render([true, false], process.stdout);