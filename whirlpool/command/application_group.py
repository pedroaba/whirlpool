from collections.abc import Callable

import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table
from textual.app import App, ComposeResult
from textual.binding import Binding
from textual.containers import Container, Horizontal, Vertical
from textual.widgets import Button, Footer, Header, Label, ListItem, ListView, Static

from whirlpool.disk.application import ApplicationDisk
from whirlpool.models.application import Application, ApplicationRemovalPlan
from whirlpool.utils.file import FileUtils


class ApplicationListItem(ListItem):
    def __init__(self, application: Application) -> None:
        self.application = application
        identifier = application.identifiers[0] if application.identifiers else "-"
        super().__init__(
            Vertical(
                Static(application.name, classes="app-name"),
                Static(identifier, classes="app-identifier"),
            )
        )


class ApplicationSelectorApp(App[Application | None]):
    CSS = """
    /* OpenCode-inspired Theme */
    $bg: #0b0f14;
    $surface: #161b22;
    $accent: #58a6ff;
    $text: #c9d1d9;
    $text-muted: #8b949e;
    $border: #30363d;
    $selection-bg: #1c2128;

    Screen {
        background: $bg;
        color: $text;
    }

    #body {
        height: 1fr;
    }

    #list-container {
        width: 1fr;
        height: 1fr;
        border-right: solid $border;
    }

    #details-container {
        width: 45;
        height: 1fr;
        background: $bg;
        padding: 0;
    }

    .section-title {
        text-style: bold;
        color: $text;
        padding: 1 2;
        background: $surface;
        border-bottom: solid $border;
    }

    #app-list {
        height: 1fr;
        background: $bg;
        border: none;
        overflow-y: scroll;
    }

    ListItem {
        height: auto;
        min-height: 4;
        padding: 0;
        background: $bg;
        border: none;
        display: block;
    }

    /* Target highlight state with more contrast */
    ListItem.--highlight {
        background: #161b22 !important;
        border-left: thick solid $accent !important;
    }

    ListItem Vertical {
        padding: 1 2;
        height: auto;
    }

    .app-name {
        text-style: bold;
        color: $text;
    }

    .app-identifier {
        color: $text-muted;
    }

    ListItem.--highlight .app-name {
        color: $accent;
    }

    ListItem.--highlight .app-identifier {
        color: #f0f6fc;
    }


    .detail-label {
        color: $text;
        text-style: bold;
        margin-top: 1;
    }

    .detail-value {
        color: $text-muted;
        margin-bottom: 1;
    }

    #footer {
        height: 1;
        background: $surface;
        color: $text-muted;
        padding: 0 2;
        border-top: solid $border;
    }
    """

    BINDINGS = [
        Binding("enter", "select", "Select"),
        Binding("escape", "cancel", "Cancel"),
        Binding("q", "cancel", "Cancel"),
    ]

    def __init__(self, applications: list[Application]) -> None:
        super().__init__()
        self._applications = applications

    def compose(self) -> ComposeResult:
        with Horizontal(id="body"):
            with Vertical(id="list-container"):
                yield Static("Installed Applications", classes="section-title")
                yield ListView(
                    *(
                        ApplicationListItem(application)
                        for application in self._applications
                    ),
                    id="app-list",
                )
            with Vertical(id="details-container"):
                yield Static("Application Details", classes="section-title")
                with Vertical(id="details-content"):
                    yield Label("NAME", classes="detail-label")
                    yield Label("", id="detail-name", classes="detail-value")
                    yield Label("IDENTIFIER", classes="detail-label")
                    yield Label("", id="detail-identifier", classes="detail-value")
                    yield Label("BUNDLE PATH", classes="detail-label")
                    yield Label("", id="detail-path", classes="detail-value")
        with Horizontal(id="footer"):
            yield Label(" Whirlpool · App Manager ")
            yield Static("", expand=True)
            yield Label(" [b]ENTER[/] Select  [b]ESC[/b] Cancel ")

    def on_mount(self) -> None:
        app_list = self.query_one("#app-list", ListView)
        if app_list.children:
            app_list.index = 0
            self._update_details(self._applications[0])

    def on_list_view_highlighted(self, event: ListView.Highlighted) -> None:
        if isinstance(event.item, ApplicationListItem):
            self._update_details(event.item.application)

    def action_select(self) -> None:
        app_list = self.query_one("#app-list", ListView)
        highlighted_child = app_list.highlighted_child
        if isinstance(highlighted_child, ApplicationListItem):
            self.exit(highlighted_child.application)

    def action_cancel(self) -> None:
        self.exit(None)

    def _update_details(self, application: Application) -> None:
        identifier = application.identifiers[0] if application.identifiers else "-"
        self.query_one("#detail-name", Label).update(application.name)
        self.query_one("#detail-identifier", Label).update(identifier)
        self.query_one("#detail-path", Label).update(str(application.path))



class ConfirmRemovalApp(App[bool]):
    CSS = """
    /* OpenCode-inspired Theme */
    $bg: #0b0f14;
    $surface: #161b22;
    $accent: #58a6ff;
    $text: #c9d1d9;
    $text-muted: #8b949e;
    $border: #30363d;

    Screen {
        layout: vertical;
        align: center middle;
        background: $bg 60%;
    }

    #dialog {
        width: 60;
        height: auto;
        border: solid $border;
        background: $bg;
        padding: 1 2;
    }

    #title {
        text-style: bold;
        color: $text;
        padding-bottom: 1;
        border-bottom: solid $border;
        margin-bottom: 1;
    }

    #message {
        color: $text-muted;
        padding: 1 0;
    }

    #actions {
        height: auto;
        align-horizontal: right;
        padding-top: 1;
        margin-top: 1;
    }

    Button {
        min-width: 14;
        margin-left: 1;
        border: none;
        height: 3;
    }

    #confirm {
        background: #da3633;
        color: white;
        text-style: bold;
    }

    #cancel {
        background: $surface;
        color: $text;
    }
    """

    BINDINGS = [
        Binding("y", "confirm", "Confirm"),
        Binding("enter", "confirm", "Confirm"),
        Binding("n", "cancel", "Cancel"),
        Binding("escape", "cancel", "Cancel"),
        Binding("q", "cancel", "Cancel"),
    ]

    def __init__(self, application: Application, target_count: int) -> None:
        super().__init__()
        self._application = application
        self._target_count = target_count

    def compose(self) -> ComposeResult:
        identifiers = ", ".join(self._application.identifiers) or "-"
        message = "\n".join(
            [
                f"Remove {self._application.name} and all related files?",
                "",
                f"Identifier: {identifiers}",
                f"Paths to delete: {self._target_count}",
            ]
        )
        with Container(id="dialog"):
            yield Static("Confirm Removal", id="title")
            yield Static(message, id="message")
            with Horizontal(id="actions"):
                yield Button("Cancel", variant="default", id="cancel")
                yield Button("Remove App", variant="error", id="confirm")

    def action_confirm(self) -> None:
        self.exit(True)

    def action_cancel(self) -> None:
        self.exit(False)

    def on_button_pressed(self, event: Button.Pressed) -> None:
        if event.button.id == "confirm":
            self.action_confirm()
            return

        self.action_cancel()


class ApplicationCommandGroup:
    def __init__(
        self,
        *,
        console_factory: Callable[[], Console] | None = None,
    ) -> None:
        self._console_factory = console_factory or Console
        self._application_disk = ApplicationDisk()

        self.app = typer.Typer(
            name="apps",
            help=(
                "Lists the applications that consume the most resources on the system and "
                "allows uninstalling an app and "
                "removing all its data."
            ),
            no_args_is_help=True,
        )
        self.app.command(
            "list",
            help="Lists the applications that consume the most resources on the system.",
        )(self.list)
        self.app.command(
            "remove",
            help="Uninstalls an application and removes all its data.",
        )(self.remove)

    def list(
        self,
        is_enable_progress: bool = typer.Option(
            True,
            "--progress/--no-progress",
            "-p/-np",
            help="Display a progress bar during listing.",
        ),
        search_for_system_files: bool = typer.Option(
            True,
            "--with-system-files/--without-system-files",
            "-sf/-nsf",
            help="Include applications installed in system directories in the scan.",
        ),
        ordered_by: str = typer.Option(
            "name",
            "--ordered-by",
            "-o",
            help='Available options: "name", "size". Default is "name".',
        ),
        ordered_dir: str = typer.Option(
            "asc",
            "--ordered-dir",
            "-d",
            help="Available options: asc, desc. Default is asc.",
        ),
    ) -> None:
        console = self._console_factory()
        self._application_disk.initialize(
            with_progress=is_enable_progress, with_system_files=search_for_system_files
        )

        applications = self._application_disk.apps

        console.print(
            "[bold]Installed applications:[/bold]",
            style="bold",
        )

        parsed_direction = ordered_dir == "desc"
        match ordered_by:
            case "name":
                applications = sorted(
                    applications,
                    key=lambda app: app.name,
                    reverse=parsed_direction,
                )
            case "size":
                applications = sorted(
                    applications,
                    key=lambda app: app.size,
                    reverse=parsed_direction,
                )
            case _:
                raise typer.BadParameter(
                    f"Invalid value for --ordered-by: {ordered_by}"
                )

        for app in applications:
            size = FileUtils.human_readable_size(app.size)
            console.print(f"  - {app.name} [b]({size})[/b]")

    def remove(self) -> None:
        console = self._console_factory()
        self._application_disk.initialize(
            with_system_files=False,
            include_sizes=False,
        )
        applications = sorted(
            self._application_disk.apps,
            key=lambda app: (app.name.casefold(), app.path.as_posix()),
        )

        if not applications:
            console.print("[yellow]No removable applications were found.[/yellow]")
            raise typer.Exit(0)

        selected_application = self._select_application(applications)
        if selected_application is None:
            console.print("[yellow]App removal cancelled.[/yellow]")
            raise typer.Exit(0)

        selected_application = self._application_disk.get_application_details(
            selected_application.path
        )
        removal_plan = self._application_disk.build_removal_plan(
            selected_application,
            with_progress=True,
        )
        self._show_removal_plan(console, removal_plan)

        confirmed = ConfirmRemovalApp(
            selected_application,
            len(removal_plan.targets),
        ).run()
        if not confirmed:
            console.print("[yellow]App removal cancelled.[/yellow]")
            raise typer.Exit(0)

        deleted_paths, failed_paths = self._application_disk.remove_application(
            removal_plan,
            with_progress=True,
        )
        self._show_removal_result(
            console,
            removal_plan=removal_plan,
            deleted_paths=deleted_paths,
            failed_paths=failed_paths,
        )

    def _select_application(
        self, applications: list[Application]
    ) -> Application | None:
        return ApplicationSelectorApp(applications).run()

    def _show_removal_plan(
        self, console: Console, removal_plan: ApplicationRemovalPlan
    ) -> None:
        application = removal_plan.application
        identifiers = (
            ", ".join(application.identifiers) if application.identifiers else "-"
        )

        summary = Table.grid(padding=(0, 2))
        summary.add_row("Application", application.name)
        summary.add_row("Identifiers", identifiers)
        summary.add_row("Bundle", str(application.path))
        summary.add_row("Targets", str(len(removal_plan.targets)))
        summary.add_row(
            "Estimated reclaimed space",
            FileUtils.human_readable_size(removal_plan.total_size),
        )

        console.print(
            Panel.fit(
                summary,
                title="Removal Plan",
                border_style="red",
            )
        )

        table = Table(title="Paths To Delete", header_style="bold red")
        table.add_column("#", justify="right", style="dim")
        table.add_column("Kind", style="cyan")
        table.add_column("Path", style="white", overflow="fold")
        table.add_column("Size", justify="right", style="green")

        for index, target in enumerate(removal_plan.targets, start=1):
            table.add_row(
                str(index),
                target.kind,
                str(target.path),
                FileUtils.human_readable_size(target.size),
            )

        console.print(table)

    def _show_removal_result(
        self,
        console: Console,
        *,
        removal_plan: ApplicationRemovalPlan,
        deleted_paths: list,
        failed_paths: list,
    ) -> None:
        deleted_size = sum(
            target.size
            for target in removal_plan.targets
            if target.path in deleted_paths
        )

        summary = Table.grid(padding=(0, 2))
        summary.add_row("Application", removal_plan.application.name)
        summary.add_row("Deleted paths", str(len(deleted_paths)))
        summary.add_row("Failed paths", str(len(failed_paths)))
        summary.add_row(
            "Estimated removed space",
            FileUtils.human_readable_size(deleted_size),
        )

        console.print(
            Panel.fit(
                summary,
                title="Removal Result",
                border_style="green" if not failed_paths else "yellow",
            )
        )

        if failed_paths:
            table = Table(
                title="Paths That Could Not Be Deleted", header_style="bold yellow"
            )
            table.add_column("Path", style="white", overflow="fold")
            for path in failed_paths:
                table.add_row(str(path))
            console.print(table)
