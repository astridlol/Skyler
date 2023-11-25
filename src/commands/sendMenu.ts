import {
	APIEmbed,
	APIEmbedField,
	APITextInputComponent,
	ActionRowBuilder,
	CommandInteraction,
	EmbedBuilder,
	ModalBuilder,
	ModalSubmitInteraction,
	StringSelectMenuBuilder,
	StringSelectMenuInteraction,
	StringSelectMenuOptionBuilder,
	TextInputBuilder,
	TextInputStyle,
	userMention
} from 'discord.js';
import { Discord, ModalComponent, SelectMenuComponent, Slash } from 'discordx';
import NodeCache from 'node-cache';
import { prisma } from '..';
import Colors from '../constants/Colors';
import { prettify } from '../lib/General';

require('toml-require').install();
const embeds: {
	menu: APIEmbed;
} = require('../constants/embeds.toml');

const tickets = require('../constants/tickets.toml');

interface TicketType {
	title: string;
	category: string;
	description?: string;
	forms: APITextInputComponent[];
}

const cache = new NodeCache({ stdTTL: 30 });

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
		const ticketValue = interaction.values.shift();

		const ticketInformation: TicketType = tickets[ticketValue];

		const modal = new ModalBuilder().setTitle(ticketInformation.title).setCustomId('ticket-menu');

		const forms: ActionRowBuilder<TextInputBuilder>[] = [];

		ticketInformation.forms.forEach((v) => {
			const form = TextInputBuilder.from(v).setStyle(TextInputStyle.Short);
			forms.push(new ActionRowBuilder<TextInputBuilder>().addComponents(form));
		});

		modal.addComponents(forms);

		interaction.showModal(modal);

		cache.set(interaction.user.id, ticketValue);

		return;
	}

	@ModalComponent({ id: 'ticket-menu' })
	async handleForm(interaction: ModalSubmitInteraction): Promise<void> {
		let fields: APIEmbedField[] = [];
		interaction.fields.fields.forEach((field) => {
			fields.push({
				name: prettify(field.customId),
				value: field.value
			});
		});

		interaction.deferUpdate();

		const ticketType: string = cache.get(interaction.user.id);
		const ticketInformation: TicketType = tickets[ticketType];

		const id = Math.random().toString(36).slice(2, 7);
		const ticketChannel = await interaction.guild.channels.create({
			name: `${ticketType}-${id}`,
			parent: ticketInformation.category
		});

		// Update permissions
		ticketChannel.lockPermissions();
		ticketChannel.permissionOverwrites.create(interaction.user.id, {
			ViewChannel: true,
			ReadMessageHistory: true,
			AttachFiles: true,
			SendMessages: true
		});

		await prisma.tickets.create({
			data: {
				id: ticketChannel.id,
				createdBy: interaction.user.id,
				type: ticketType
			}
		});

		const type = prettify(ticketType);
		const embed = new EmbedBuilder()
			.setColor(Colors.purple)
			.setTitle(`${type} Ticket`)
			.setFields(fields);

		ticketChannel.send({
			content: userMention(interaction.user.id),
			embeds: [embed]
		});
	}
}
