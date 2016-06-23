# table-style
CLI Table formatter for NodeJS

# Installing
For the latest stable version:
```
npm install table-style
```

# Usage
```ts
import { Table } from "table-style";

interface User {
    name: string;
    role: string;
    office: string;
}

const table = new Table<User>({
    border: "single",
    groups: [
        { by: user => user.role }
    ],
    columns: [
        { header: "name", expression: x => x.name },
        { header: "office", expression: x => x.office, align: "right" }
    ],
    rowStyles: [
        { section: "header", border: { bottom: "double" }, foregroundColor: "white" },
        { section: "body", border: { top: "none", bottom: "none" } }
    ]
});

table.render(users, process.out);
```

# API
