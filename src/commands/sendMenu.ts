import {
	APIEmbed,
	ActionRowBuilder,
	CommandInteraction,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder
} from 'discord.js';
import { Discord, SelectMenuComponent, Slash } from 'discordx';

require('toml-require').install();
const embeds: {
	menu: APIEmbed;
} = require('../constants/embeds.toml');

const tickets = require('../constants/tickets.toml');

interface TicketType {
	title: string;
	category: string;
	description?: string;
}

@Discord()
class SendMenu {
	@Slash({ description: 'Send the ticket menu', defaultMemberPermissions: 'ManageGuild' })
	async sendmenu(interaction: CommandInteraction) {
		console.log(Object.keys(tickets));

		const options: StringSelectMenuOptionBuilder[] = [];

		Object.keys(tickets).forEach((k: string) => {
			const ticketType: TicketType = tickets[k];
			const option = new StringSelectMenuOptionBuilder().setLabel(ticketType.title).setValue(k);
			if (ticketType.description != null) option.setDescription(ticketType.description);
			options.push(option);
		});

		const select = new StringSelectMenuBuilder().setCustomId('ticket-menu').addOptions(options);

		const row = new ActionRowBuilder<StringSelectMenuBuilder>().addComponents(select);

		interaction.channel.send({
			embeds: [embeds.menu],
			components: [row]
		});

		interaction.reply({
			content: 'Sent embed',
			ephemeral: true
		});
	}

	@SelectMenuComponent({ id: 'ticket-menu' })
	async handle(interaction: StringSelectMenuInteraction): Promise<unknown> {
		await interaction.deferReply();

		const ticketValue = interaction.values.shift();

		interaction.editReply({
			content: ticketValue
		});

		return;
	}
}
