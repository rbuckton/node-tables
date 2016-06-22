import * as table from "../lib";

interface User {
    name: string;
    age: number;
    gender: "M" | "F";
}

const t = new table.Table<User>({
    border: {
        top: "single",
        bottom: "single",
        left: "single",
        right: "single",
        horizontal: "none",
        vertical: "single"
    },
    columns: [
        { header: "name", expression: x => x.name, border: "double" },
        { header: "age", expression: x => x.age }
    ],
    groups: [
        { by: x => x.age },
        { by: x => x.gender }
    ],
    groupStyles: [
        { depth: 0, backgroundColor: "cyan", foregroundColor: "black" },
        { depth: 1, backgroundColor: "green", foregroundColor: "white" }
    ],
    rowStyles: [
        { section: ["group", "header"], border: "single" }
    ]
});

t.render([
    { name: "John", age: 25, gender: "M" },
    { name: "Mary", age: 25, gender: "F" },
    { name: "Bob", age: 26, gender: "M" }
], process.stdout);